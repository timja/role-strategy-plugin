import type { PermissionGroup } from "./permission.ts";
import type { Role, RoleType } from "./role.ts";
import type { PermissionTemplate } from "./template.ts";

export interface BootstrapRoles {
  globalRoles: Role[];
  projectRoles: Role[];
  slaveRoles: Role[];
}

export interface BootstrapPermissionGroups {
  globalRoles: PermissionGroup[];
  projectRoles: PermissionGroup[];
  slaveRoles: PermissionGroup[];
}

export interface ManageRolesBootstrap {
  roles: BootstrapRoles;
  permissionGroups: BootstrapPermissionGroups;
  permissionTemplates: PermissionTemplate[];
  permissions: {
    canEditGlobal: boolean;
    canEditProject: boolean;
    canEditAgent: boolean;
  };
}

export interface AssignRolesBootstrap {
  roles: BootstrapRoles;
  assignments: {
    globalRoles: AssignedSid[];
    projectRoles: AssignedSid[];
    slaveRoles: AssignedSid[];
  };
  permissions: {
    canEditGlobal: boolean;
    canEditProject: boolean;
    canEditAgent: boolean;
  };
}

export interface AssignedSid {
  sid: string;
  type: "USER" | "GROUP";
  roles: string[];
}

export interface TemplatesBootstrap {
  templates: PermissionTemplate[];
  permissionGroups: PermissionGroup[];
  canEdit: boolean;
}

export interface MacrosBootstrap {
  macros: RoleMacro[];
}

export interface RoleMacro {
  name: string;
  applicableTo: { global: boolean; project: boolean; slave: boolean };
  description: string;
}

export const ROLE_TYPES: readonly RoleType[] = [
  "globalRoles",
  "projectRoles",
  "slaveRoles",
];
