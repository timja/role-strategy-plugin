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

export interface AssignRoleHeader {
  name: string;
  pattern: string;
  permissionLabels: string[];
}

export interface AssignRolesBootstrap {
  roles: {
    globalRoles: AssignRoleHeader[];
    projectRoles: AssignRoleHeader[];
    slaveRoles: AssignRoleHeader[];
  };
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
  /**
   * "EITHER" represents a legacy / ambiguous assignment — Jenkins couldn't
   * decide whether the SID was a user or a group at write time and stored
   * it under both. The UI should let admins migrate these to a concrete
   * type via the Edit dialog.
   */
  type: "USER" | "GROUP" | "EITHER";
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
