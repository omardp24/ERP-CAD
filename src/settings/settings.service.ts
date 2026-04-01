// src/settings/settings.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserAccessDto } from './dto/update-user-access.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

type ModuleKey =
  | 'dashboard'
  | 'finanzas'
  | 'inventarios'
  | 'productores'
  | 'compras'
  | 'ventas'
  | 'configuracion';

type RoleKey = 'ADMIN' | 'SUPERVISOR' | 'TESORERIA' | 'CONSULTA' | 'USER';

type ModulePerm = {
  enabled: boolean;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

type RolePermissions = Record<ModuleKey, ModulePerm>;

const MODULES: ModuleKey[] = [
  'dashboard',
  'finanzas',
  'inventarios',
  'productores',
  'compras',
  'ventas',
  'configuracion',
];

const ROLES: RoleKey[] = ['ADMIN', 'SUPERVISOR', 'TESORERIA', 'CONSULTA', 'USER'];

function preset(p: 'NONE' | 'READ' | 'OPS' | 'FULL'): ModulePerm {
  if (p === 'NONE')
    return { enabled: false, view: false, create: false, edit: false, delete: false };
  if (p === 'READ')
    return { enabled: true, view: true, create: false, edit: false, delete: false };
  if (p === 'OPS')
    return { enabled: true, view: true, create: true, edit: true, delete: false };
  return { enabled: true, view: true, create: true, edit: true, delete: true };
}

function defaultRolePerms(role: RoleKey): RolePermissions {
  const base: any = {};
  for (const m of MODULES) base[m] = preset('NONE');

  if (role === 'ADMIN') {
    for (const m of MODULES) base[m] = preset('FULL');
    return base;
  }

  if (role === 'CONSULTA') {
    for (const m of MODULES) base[m] = preset('READ');
    return base;
  }

  if (role === 'SUPERVISOR') {
    for (const m of MODULES) base[m] = preset('READ');
    for (const m of ['finanzas', 'inventarios', 'productores', 'compras', 'ventas'] as ModuleKey[]) {
      base[m] = preset('OPS');
    }
    base['configuracion'] = preset('READ');
    return base;
  }

  if (role === 'TESORERIA') {
    base['dashboard'] = preset('READ');
    base['finanzas'] = preset('OPS');
    base['compras'] = preset('OPS');
    return base;
  }

  // USER
  base['dashboard'] = preset('READ');
  base['inventarios'] = preset('READ');
  base['productores'] = preset('READ');
  return base;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================
  // USERS
  // ============================
  async listUsers() {
    return this.prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateUserAccess(userId: number, dto: UpdateUserAccessDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const warehouseIds = Array.isArray(dto.warehouseIds) ? dto.warehouseIds : [];
    const producerIds = Array.isArray(dto.producerIds) ? dto.producerIds : [];
    const companies = Array.isArray(dto.companies) ? dto.companies : [];

    await this.prisma.$transaction(async (tx) => {
      // 1) Warehouses
      await tx.userWarehouseAccess.deleteMany({ where: { userId } });
      if (warehouseIds.length) {
        await tx.userWarehouseAccess.createMany({
          data: warehouseIds.map((warehouseId) => ({ userId, warehouseId })),
          skipDuplicates: true,
        });
      }

      // 2) Producers
      await tx.userProducerAccess.deleteMany({ where: { userId } });
      if (producerIds.length) {
        await tx.userProducerAccess.createMany({
          data: producerIds.map((producerId) => ({ userId, producerId })),
          skipDuplicates: true,
        });
      }

      // 3) Companies
      await tx.userCompanyAccess.deleteMany({ where: { userId } });
      if (companies.length) {
        await tx.userCompanyAccess.createMany({
          data: companies.map((company) => ({ userId, company })),
          skipDuplicates: true,
        });
      }
    });

    return { ok: true };
  }

  // ============================
  // WAREHOUSES (tu tabla se llama warehouses)
  // ============================
  async listWarehouses() {
    return this.prisma.warehouses.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, location: true, created_at: true },
    });
  }

  async createWarehouse(dto: CreateWarehouseDto) {
    const name = (dto.name ?? '').trim();
    if (!name) throw new BadRequestException('El nombre es obligatorio');

    const location =
      dto.location === null ? null : (dto.location ?? '').trim() || null;

    return this.prisma.warehouses.create({
      data: { name, location },
      select: { id: true, name: true, location: true, created_at: true },
    });
  }

  async updateWarehouse(id: number, body: { name?: string; location?: string | null }) {
    const exists = await this.prisma.warehouses.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Almacén no encontrado');

    const data: any = {};

    if (body.name !== undefined) {
      const name = (body.name ?? '').trim();
      if (!name) throw new BadRequestException('El nombre no puede estar vacío');
      data.name = name;
    }

    if (body.location !== undefined) {
      data.location = body.location === null ? null : (body.location ?? '').trim() || null;
    }

    return this.prisma.warehouses.update({
      where: { id },
      data,
      select: { id: true, name: true, location: true, created_at: true },
    });
  }

  async deleteWarehouse(id: number) {
    const exists = await this.prisma.warehouses.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Almacén no encontrado');

    await this.prisma.warehouses.delete({ where: { id } });
    return { ok: true };
  }

  // ============================
  // PRODUCERS / COMPANIES
  // ============================
  async listProducers() {
    return this.prisma.producers.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, code: true, rif: true },
    });
  }

  async listCompanies() {
    // Si tu front necesita solo ['CAD','SILO_AMAZO'], cambia el return.
    return [
      { code: 'CAD', name: 'CAD' },
      { code: 'SILO_AMAZO', name: 'SILO AMAZO' },
    ];
  }

  // ============================
  // ROLES & PERMISSIONS
  // ============================
  private normalizeRole(role: string): RoleKey {
    const r = (role || '').toUpperCase().trim() as RoleKey;
    if (!ROLES.includes(r)) throw new BadRequestException(`Rol inválido: ${role}`);
    return r;
  }

  private normalizeModule(module: string): ModuleKey {
    const m = (module || '').toLowerCase().trim() as ModuleKey;
    if (!MODULES.includes(m)) throw new BadRequestException(`Módulo inválido: ${module}`);
    return m;
  }

  private async ensureSeed(role: RoleKey) {
    // OJO: esto requiere que exista el modelo/delegate role_permissions en Prisma
    const count = await this.prisma.role_permissions.count({ where: { role } });
    if (count > 0) return;

    const defaults = defaultRolePerms(role);
    await this.prisma.role_permissions.createMany({
      data: MODULES.map((m) => ({
        role,
        module: m,
        enabled: defaults[m].enabled,
        can_view: defaults[m].view,
        can_create: defaults[m].create,
        can_edit: defaults[m].edit,
        can_delete: defaults[m].delete,
      })),
    });
  }

  async listRolesPermissions() {
    for (const r of ROLES) await this.ensureSeed(r);

    const rows = await this.prisma.role_permissions.findMany({
      orderBy: [{ role: 'asc' }, { module: 'asc' }],
      select: {
        role: true,
        module: true,
        enabled: true,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
      },
    });

    const out: Record<string, RolePermissions> = {};
    for (const r of ROLES) out[r] = defaultRolePerms(r);

    for (const row of rows) {
      const role = this.normalizeRole(row.role);
      const module = this.normalizeModule(row.module);
      out[role][module] = {
        enabled: row.enabled,
        view: row.can_view,
        create: row.can_create,
        edit: row.can_edit,
        delete: row.can_delete,
      };
    }

    return out;
  }

  async getRolePermissions(role: string) {
    const r = this.normalizeRole(role);
    await this.ensureSeed(r);

    const rows = await this.prisma.role_permissions.findMany({
      where: { role: r },
      orderBy: { module: 'asc' },
      select: {
        role: true,
        module: true,
        enabled: true,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
      },
    });

    const result = defaultRolePerms(r);
    for (const row of rows) {
      const module = this.normalizeModule(row.module);
      result[module] = {
        enabled: row.enabled,
        view: row.can_view,
        create: row.can_create,
        edit: row.can_edit,
        delete: row.can_delete,
      };
    }

    return { role: r, permissions: result };
  }

  async updateRolePermissions(role: string, dto: UpdateRolePermissionsDto) {
    const r = this.normalizeRole(role);

    if (!dto?.permissions || typeof dto.permissions !== 'object') {
      throw new BadRequestException('permissions es requerido');
    }

    const next: RolePermissions = defaultRolePerms(r);

    for (const moduleKey of Object.keys(dto.permissions)) {
      const m = this.normalizeModule(moduleKey);
      const v = (dto.permissions as any)[moduleKey] || {};

      next[m] = {
        enabled: !!v.enabled,
        view: !!v.view,
        create: !!v.create,
        edit: !!v.edit,
        delete: !!v.delete,
      };

      // reglas de consistencia
      if (!next[m].enabled || !next[m].view) {
        next[m] = { enabled: false, view: false, create: false, edit: false, delete: false };
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.role_permissions.deleteMany({ where: { role: r } });
      await tx.role_permissions.createMany({
        data: MODULES.map((m) => ({
          role: r,
          module: m,
          enabled: next[m].enabled,
          can_view: next[m].view,
          can_create: next[m].create,
          can_edit: next[m].edit,
          can_delete: next[m].delete,
        })),
      });
    });

    return { ok: true, role: r, permissions: next };
  }
}
