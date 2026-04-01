import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

type GetRateArgs = { base: string; quote: string };

type FxResponse = {
  source: 'BCV' | 'FALLBACK';
  base: string;   // USD
  quote: string;  // VES
  rate: number;   // VES per 1 USD
  date?: string;  // si se consigue
  fetchedAt: string;
};

@Injectable()
export class FxService {
  // Cache simple en memoria (evita pegarle a BCV cada click)
  private cache: { value: FxResponse; expiresAt: number } | null = null;

  async getBcvRate({ base, quote }: GetRateArgs): Promise<FxResponse> {
    // Solo soportamos USD/VES por ahora
    if (!(base === 'USD' && quote === 'VES')) {
      throw new ServiceUnavailableException(
        `FX pair not supported yet: ${base}/${quote}`,
      );
    }

    // cache 30 min
    const now = Date.now();
    if (this.cache && now < this.cache.expiresAt) {
      return this.cache.value;
    }

    // 1) Intentar BCV real (scrape)
    try {
      const bcv = await this.fetchFromBcvWebsite();
      const out: FxResponse = {
        source: 'BCV',
        base,
        quote,
        rate: bcv.rate,
        date: bcv.date,
        fetchedAt: new Date().toISOString(),
      };

      this.cache = { value: out, expiresAt: now + 30 * 60 * 1000 };
      return out;
    } catch (e) {
      // sigue al fallback
    }

    // 2) Fallback: bcv-api.deno.dev (OJO: responde array y puede estar desactualizada)
    try {
      const fb = await this.fetchFromDenoFallback();
      const out: FxResponse = {
        source: 'FALLBACK',
        base,
        quote,
        rate: fb.rate,
        date: fb.date,
        fetchedAt: new Date().toISOString(),
      };

      // cache corto si es fallback
      this.cache = { value: out, expiresAt: now + 10 * 60 * 1000 };
      return out;
    } catch (e: any) {
      throw new ServiceUnavailableException(
        `BCV rate unavailable. ${e?.message || ''}`.trim(),
      );
    }
  }

  private async fetchFromDenoFallback(): Promise<{ rate: number; date?: string }> {
  const url = 'https://bcv-api.deno.dev/v1/exchange/Dolar';
  const res = await axios.get(url, { timeout: 12_000 });
  const data = res.data;

  const item = Array.isArray(data) ? data[0] : data;

  const rate = this.toNumber(item?.exchange ?? item?.rate ?? item?.value);
  const dateRaw = typeof item?.date === 'string' ? item.date : undefined;

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Invalid rate from fallback API: ${String(item?.exchange)}`);
  }

  // ✅ Validación de fecha (anti-tasa vieja)
  // Si trae una fecha muy vieja, rechazamos el fallback
  if (dateRaw) {
    const d = new Date(dateRaw);
    if (!Number.isFinite(d.getTime())) {
      throw new Error(`Invalid date from fallback API: ${dateRaw}`);
    }

    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Permite máximo 3 días de atraso (por feriados/fines de semana)
    if (diffDays > 3) {
      throw new Error(`Fallback API is stale (date=${dateRaw})`);
    }
  } else {
    // Si no viene fecha, no confiamos en fallback
    throw new Error('Fallback API has no date (stale/unknown)');
  }

  return { rate, date: dateRaw };
}

  private async fetchFromBcvWebsite(): Promise<{ rate: number; date?: string }> {
    // OJO: BCV a veces bloquea bots. Con user-agent suele ayudar.
    const url = 'https://www.bcv.org.ve/';

    const res = await axios.get(url, {
  timeout: 12_000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari',
    Accept: 'text/html,application/xhtml+xml',
    'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
    Referer: 'https://www.bcv.org.ve/',
  },
});


    const html = res.data as string;
    const $ = cheerio.load(html);

    // Estrategia 1: buscar texto completo y extraer "Dólar" + número
    const bodyText = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    // Captura algo tipo: "Dólar ... 36,52130000" o "Dólar ... 36.52"
    const m =
      bodyText.match(/D[oó]lar[^0-9]{0,80}([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2,8})?)/i) ||
      bodyText.match(/\bUSD\b[^0-9]{0,80}([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2,8})?)/i);

    if (!m?.[1]) {
      throw new Error('Could not locate USD rate on BCV page');
    }

    const rate = this.toNumber(m[1]);

    // Date opcional (si aparece algo tipo 06/01/2026 o 2026-01-06)
    const dm =
      bodyText.match(/\b(\d{2}\/\d{2}\/\d{4})\b/) ||
      bodyText.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    const date = dm?.[1];

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Invalid parsed BCV rate: ${m[1]}`);
    }

    return { rate, date };
  }

  private toNumber(v: any): number {
    if (typeof v === 'number') return v;
    if (typeof v !== 'string') return Number(v);

    // Maneja formatos: "36,5213" o "36.5213" o "1.234,56"
    const s = v.trim();

    // Si tiene coma y punto: asumimos miles con punto y decimales con coma
    if (s.includes(',') && s.includes('.')) {
      return Number(s.replace(/\./g, '').replace(',', '.'));
    }

    // Si solo tiene coma: coma decimal
    if (s.includes(',') && !s.includes('.')) {
      return Number(s.replace(',', '.'));
    }

    // Solo punto: punto decimal normal
    return Number(s);
  }
}
