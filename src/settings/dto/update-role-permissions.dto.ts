import { IsObject } from 'class-validator';

export class UpdateRolePermissionsDto {
  // Estructura esperada:
  // {
  //   dashboard: { enabled, view, create, edit, delete },
  //   finanzas: { ... },
  //   ...
  // }
  @IsObject()
  permissions: Record<
    string,
    {
      enabled?: boolean;
      view?: boolean;
      create?: boolean;
      edit?: boolean;
      delete?: boolean;
    }
  >;
}
