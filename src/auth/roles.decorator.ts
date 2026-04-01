// src/auth/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// ✅ Asegúrate de que aquí estén TODOS tus roles reales
export type Role =
  | 'ADMIN'
  | 'SUPERVISOR'
  | 'TESORERIA'
  | 'OPERACIONES'
  | 'COMPRAS'
  | 'VENTAS'
  | 'INVENTARIOS'
  | 'CONSULTA'
  | 'USER';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
