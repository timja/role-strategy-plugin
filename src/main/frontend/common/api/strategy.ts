import type { AuthorizationType, RoleType } from "../types/role.ts";
import { getJson, postForm } from "./client.ts";

export interface StrategyClient {
  addRole(input: AddRoleInput): Promise<void>;
  removeRoles(type: RoleType, roleNames: string[]): Promise<void>;
  assignUserRole(type: RoleType, roleName: string, user: string): Promise<void>;
  assignGroupRole(
    type: RoleType,
    roleName: string,
    group: string,
  ): Promise<void>;
  unassignUserRole(
    type: RoleType,
    roleName: string,
    user: string,
  ): Promise<void>;
  unassignGroupRole(
    type: RoleType,
    roleName: string,
    group: string,
  ): Promise<void>;
  deleteUser(type: RoleType, user: string): Promise<void>;
  deleteGroup(type: RoleType, group: string): Promise<void>;
  deleteSid(type: RoleType, sid: string): Promise<void>;
  getRole(type: RoleType, roleName: string): Promise<GetRoleResponse>;
  getAllRoles(type: RoleType): Promise<Record<string, AssignedEntry[]>>;
  getRoleAssignments(type: RoleType): Promise<AssignmentRow[]>;
  getMatchingJobs(
    pattern: string,
    maxJobs?: number,
  ): Promise<MatchingItemsResponse>;
  getMatchingAgents(
    pattern: string,
    maxAgents?: number,
  ): Promise<MatchingAgentsResponse>;
  addTemplate(name: string, permissionIds: string[]): Promise<void>;
  removeTemplates(templateNames: string[]): Promise<void>;
  getTemplate(name: string): Promise<GetTemplateResponse>;
}

export interface AddRoleInput {
  type: RoleType;
  roleName: string;
  permissionIds: string[];
  overwrite: boolean;
  pattern?: string;
  template?: string;
}

export interface AssignedEntry {
  type: AuthorizationType;
  sid: string;
}

export interface AssignmentRow {
  name: string;
  type: AuthorizationType;
  roles: string[];
}

export interface GetRoleResponse {
  permissionIds: Record<string, boolean>;
  sids: AssignedEntry[];
  pattern: string;
  template?: string | null;
}

export interface GetTemplateResponse {
  permissionIds: Record<string, boolean>;
  isUsed: boolean;
}

export interface MatchingItemsResponse {
  matchingJobs: string[];
  itemCount: number;
}

export interface MatchingAgentsResponse {
  matchingAgents: string[];
  agentCount: number;
}

export function createStrategyClient(baseUrl: string): StrategyClient {
  const url = (endpoint: string) => `${baseUrl}/${endpoint}`;

  return {
    addRole: ({
      type,
      roleName,
      permissionIds,
      overwrite,
      pattern,
      template,
    }) =>
      postForm(url("addRole"), {
        type,
        roleName,
        permissionIds: permissionIds.join(","),
        overwrite: String(overwrite),
        pattern,
        template,
      }),
    removeRoles: (type, roleNames) =>
      postForm(url("removeRoles"), { type, roleNames: roleNames.join(",") }),
    assignUserRole: (type, roleName, user) =>
      postForm(url("assignUserRole"), { type, roleName, user }),
    assignGroupRole: (type, roleName, group) =>
      postForm(url("assignGroupRole"), { type, roleName, group }),
    unassignUserRole: (type, roleName, user) =>
      postForm(url("unassignUserRole"), { type, roleName, user }),
    unassignGroupRole: (type, roleName, group) =>
      postForm(url("unassignGroupRole"), { type, roleName, group }),
    deleteUser: (type, user) => postForm(url("deleteUser"), { type, user }),
    deleteGroup: (type, group) => postForm(url("deleteGroup"), { type, group }),
    deleteSid: (type, sid) => postForm(url("deleteSid"), { type, sid }),
    getRole: (type, roleName) =>
      getJson<GetRoleResponse>(url("getRole"), { type, roleName }),
    getAllRoles: (type) =>
      getJson<Record<string, AssignedEntry[]>>(url("getAllRoles"), { type }),
    getRoleAssignments: (type) =>
      getJson<AssignmentRow[]>(url("getRoleAssignments"), { type }),
    getMatchingJobs: (pattern, maxJobs = 100) =>
      getJson<MatchingItemsResponse>(url("getMatchingJobs"), {
        pattern,
        maxJobs,
      }),
    getMatchingAgents: (pattern, maxAgents = 100) =>
      getJson<MatchingAgentsResponse>(url("getMatchingAgents"), {
        pattern,
        maxAgents,
      }),
    addTemplate: (name, permissionIds) =>
      postForm(url("addTemplate"), {
        name,
        permissionIds: permissionIds.join(","),
        overwrite: "true",
      }),
    removeTemplates: (templateNames) =>
      postForm(url("removeTemplates"), {
        templateNames: templateNames.join(","),
      }),
    getTemplate: (name) =>
      getJson<GetTemplateResponse>(url("getTemplate"), { name }),
  };
}
