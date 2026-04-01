type Scopes = {
  warehouseIds: number[] | null;
  producerIds: number[] | null;
  companies: string[] | null;
};

type ApplyScopeOptions = {
  warehouseField?: string; // ej: "warehouse_id" o "warehouseId"
  producerField?: string;  // ej: "producer_id" o "producerId"
  companyField?: string;   // ej: "company"
};

export function applyScopeToWhere(where: any, scopes: Scopes, opts: ApplyScopeOptions) {
  const out = { ...(where ?? {}) };

  if (opts.warehouseField && scopes.warehouseIds) {
    out[opts.warehouseField] = { in: scopes.warehouseIds };
  }

  if (opts.producerField && scopes.producerIds) {
    out[opts.producerField] = { in: scopes.producerIds };
  }

  if (opts.companyField && scopes.companies) {
    out[opts.companyField] = { in: scopes.companies };
  }

  return out;
}
