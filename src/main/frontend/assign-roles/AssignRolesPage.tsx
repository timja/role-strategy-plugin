import "../common/styles/role-strategy.scss";

import { useCallback, useMemo, useState } from "react";

import type { StrategyClient } from "../common/api/strategy.ts";
import { useAppBarButton } from "../common/components/AppBarButton.tsx";
import { Card } from "../common/components/Card.tsx";
import { SearchWithFilter } from "../common/components/SearchWithFilter.tsx";
import type {
  AssignedSid,
  AssignRolesBootstrap,
} from "../common/types/bootstrap.ts";
import type { PermissionGroup } from "../common/types/permission.ts";
import type { RoleType } from "../common/types/role.ts";
import { AssignDialog } from "./AssignDialog.tsx";

interface AssignRolesPageProps {
  bootstrap: AssignRolesBootstrap;
  canEdit: boolean;
  client: StrategyClient;
}

interface MergedSid {
  sid: string;
  type: "USER" | "GROUP";
  roles: {
    globalRoles: string[];
    projectRoles: string[];
    slaveRoles: string[];
  };
}

const SCOPES: { type: RoleType; label: string }[] = [
  { type: "globalRoles", label: "Global" },
  { type: "projectRoles", label: "Item" },
  { type: "slaveRoles", label: "Agent" },
];

export function AssignRolesPage({
  bootstrap,
  canEdit,
  client,
}: AssignRolesPageProps) {
  const [assignments, setAssignments] = useState(bootstrap.assignments);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<
    "closed" | "add" | { edit: string; type: "USER" | "GROUP" }
  >("closed");
  const [error, setError] = useState<string | null>(null);

  const openAdd = useCallback(() => setMode("add"), []);
  useAppBarButton("rsp-assign-role-btn", openAdd);

  const merged: MergedSid[] = useMemo(() => {
    const map = new Map<string, MergedSid>();
    for (const scope of SCOPES) {
      for (const entry of assignments[scope.type] as AssignedSid[]) {
        const key = `${entry.type}:${entry.sid}`;
        let m = map.get(key);
        if (!m) {
          m = {
            sid: entry.sid,
            type: entry.type,
            roles: { globalRoles: [], projectRoles: [], slaveRoles: [] },
          };
          map.set(key, m);
        }
        m.roles[scope.type] = entry.roles;
      }
    }
    return Array.from(map.values()).sort((a, b) => a.sid.localeCompare(b.sid));
  }, [assignments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((m) => m.sid.toLowerCase().includes(q));
  }, [merged, search]);

  const replaceAssignments = (next: AssignRolesBootstrap["assignments"]) => {
    setAssignments(next);
  };

  const updateScope = (
    type: RoleType,
    update: (prev: AssignedSid[]) => AssignedSid[],
  ) => {
    setAssignments((prev) => ({
      ...prev,
      [type]: update(prev[type] as AssignedSid[]),
    }));
  };

  const handleAssign = async (input: {
    sid: string;
    type: "USER" | "GROUP";
    roles: Partial<Record<RoleType, string[]>>;
  }) => {
    for (const scope of SCOPES) {
      const roleNames = input.roles[scope.type] ?? [];
      for (const roleName of roleNames) {
        if (input.type === "USER") {
          await client.assignUserRole(scope.type, roleName, input.sid);
        } else {
          await client.assignGroupRole(scope.type, roleName, input.sid);
        }
      }
    }
    const next: AssignRolesBootstrap["assignments"] = {
      globalRoles: [...assignments.globalRoles],
      projectRoles: [...assignments.projectRoles],
      slaveRoles: [...assignments.slaveRoles],
    };
    for (const scope of SCOPES) {
      const roleNames = input.roles[scope.type] ?? [];
      if (roleNames.length === 0) continue;
      const list = next[scope.type];
      const existing = list.find(
        (e) => e.sid === input.sid && e.type === input.type,
      );
      if (existing) {
        existing.roles = Array.from(new Set([...existing.roles, ...roleNames]));
      } else {
        list.push({ sid: input.sid, type: input.type, roles: roleNames });
      }
    }
    replaceAssignments(next);
    setMode("closed");
  };

  const handleToggleRole = async (
    sid: MergedSid,
    scope: RoleType,
    roleName: string,
    next: boolean,
  ) => {
    setError(null);
    const prev = assignments;
    updateScope(scope, (list) => {
      const existing = list.find(
        (e) => e.sid === sid.sid && e.type === sid.type,
      );
      if (next) {
        if (existing) {
          if (existing.roles.includes(roleName)) return list;
          return list.map((e) =>
            e === existing ? { ...e, roles: [...e.roles, roleName] } : e,
          );
        }
        return [...list, { sid: sid.sid, type: sid.type, roles: [roleName] }];
      } else {
        if (!existing) return list;
        const remaining = existing.roles.filter((r) => r !== roleName);
        if (remaining.length === 0) {
          return list.filter((e) => e !== existing);
        }
        return list.map((e) =>
          e === existing ? { ...e, roles: remaining } : e,
        );
      }
    });
    try {
      if (next) {
        if (sid.type === "USER") {
          await client.assignUserRole(scope, roleName, sid.sid);
        } else {
          await client.assignGroupRole(scope, roleName, sid.sid);
        }
      } else {
        if (sid.type === "USER") {
          await client.unassignUserRole(scope, roleName, sid.sid);
        } else {
          await client.unassignGroupRole(scope, roleName, sid.sid);
        }
      }
    } catch (err) {
      setAssignments(prev);
      setError(
        `Failed to ${next ? "assign" : "unassign"} ${roleName} for ${sid.sid}: ${
          (err as Error).message
        }`,
      );
    }
  };

  const handleDeleteSid = async (sid: MergedSid) => {
    if (
      !window.confirm(
        `Remove all assignments for ${sid.type.toLowerCase()} "${sid.sid}"?`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      for (const scope of SCOPES) {
        const list = assignments[scope.type];
        const existing = list.find(
          (e) => e.sid === sid.sid && e.type === sid.type,
        );
        if (!existing || existing.roles.length === 0) continue;
        if (sid.type === "USER") {
          await client.deleteUser(scope.type, sid.sid);
        } else {
          await client.deleteGroup(scope.type, sid.sid);
        }
      }
      const next: AssignRolesBootstrap["assignments"] = {
        globalRoles: assignments.globalRoles.filter(
          (e) => !(e.sid === sid.sid && e.type === sid.type),
        ),
        projectRoles: assignments.projectRoles.filter(
          (e) => !(e.sid === sid.sid && e.type === sid.type),
        ),
        slaveRoles: assignments.slaveRoles.filter(
          (e) => !(e.sid === sid.sid && e.type === sid.type),
        ),
      };
      replaceAssignments(next);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const allRolesByScope = bootstrap.roles;

  // Build a permission group "Roles" for the search filter — let users filter
  // by which roles a SID has assigned. Use SCOPES as group titles.
  const filterGroups: PermissionGroup[] = useMemo(
    () =>
      SCOPES.map((scope) => ({
        title: scope.label,
        permissions: allRolesByScope[scope.type].map((r) => ({
          id: `${scope.type}:${r.name}`,
          name: r.name,
          description: r.pattern,
          impliedByList: [],
        })),
      })).filter((g) => g.permissions.length > 0),
    [allRolesByScope],
  );

  const [filterIds, setFilterIds] = useState<ReadonlySet<string>>(new Set());

  const filteredByRoles = useMemo(() => {
    if (filterIds.size === 0) return filtered;
    return filtered.filter((sid) =>
      [...filterIds].every((id) => {
        const [scope, roleName] = id.split(":");
        return sid.roles[scope as RoleType].includes(roleName);
      }),
    );
  }, [filtered, filterIds]);

  const toggleFilter = (id: string) => {
    setFilterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const editing =
    typeof mode === "object" && "edit" in mode
      ? (merged.find((m) => m.sid === mode.edit && m.type === mode.type) ??
        null)
      : null;

  return (
    <>
      {error && (
        <div className="jenkins-alert jenkins-alert-danger jenkins-!-margin-bottom-3">
          {error}
        </div>
      )}
      <div className="jenkins-!-margin-bottom-3">
        <SearchWithFilter
          searchPlaceholder="Search users and groups"
          search={search}
          onSearchChange={setSearch}
          filterGroups={filterGroups}
          filterLabel="Filter by role"
          selectedFilterIds={filterIds}
          onFilterToggle={toggleFilter}
          onFilterReset={() => setFilterIds(new Set())}
        />
      </div>
      {merged.length === 0 ? (
        <div className="jenkins-notice">
          <div className="jenkins-notice__title">No assignments yet</div>
          {canEdit && (
            <div>
              Use the Assign role button in the toolbar to assign roles.
            </div>
          )}
        </div>
      ) : filteredByRoles.length === 0 ? (
        <div className="jenkins-notice rsp-empty-state">
          No matching users or groups
        </div>
      ) : (
        <div className="rsp-cards">
          {filteredByRoles.map((m) => {
            const summaryParts: string[] = [];
            for (const scope of SCOPES) {
              for (const r of m.roles[scope.type]) {
                summaryParts.push(`${scope.label}/${r}`);
              }
            }
            const isUser = m.type === "USER";
            return (
              <Card
                key={`${m.type}:${m.sid}`}
                name={m.sid}
                badges={
                  <span className="rsp-card__template-badge">
                    {isUser ? "User" : "Group"}
                  </span>
                }
                summary={summaryParts.sort().join(", ") || null}
                actions={
                  canEdit && (
                    <>
                      <button
                        type="button"
                        className="jenkins-button jenkins-button--tertiary rsp-card__action"
                        title="Edit assignments"
                        onClick={() => setMode({ edit: m.sid, type: m.type })}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="jenkins-button jenkins-button--tertiary jenkins-!-destructive-color rsp-card__action"
                        title="Remove from all scopes"
                        onClick={() => handleDeleteSid(m)}
                      >
                        <TrashIcon />
                      </button>
                    </>
                  )
                }
                readOnly={!canEdit}
                body={
                  <div className="rsp-assign-detail">
                    {SCOPES.map((scope) => {
                      const assignedNames = new Set(m.roles[scope.type]);
                      const availableRoles = allRolesByScope[scope.type];
                      if (availableRoles.length === 0) return null;
                      return (
                        <fieldset key={scope.type} className="rsp-perm__group">
                          <legend className="rsp-perm__group-title">
                            {scope.label} roles
                          </legend>
                          <div className="rsp-perm__permissions">
                            {availableRoles.map((role) => (
                              <label
                                key={role.name}
                                className="rsp-perm__item"
                                title={role.pattern}
                              >
                                <input
                                  type="checkbox"
                                  checked={assignedNames.has(role.name)}
                                  disabled={!canEdit}
                                  onChange={(e) =>
                                    handleToggleRole(
                                      m,
                                      scope.type,
                                      role.name,
                                      e.target.checked,
                                    )
                                  }
                                />
                                <span className="rsp-perm__item-name">
                                  {role.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      );
                    })}
                  </div>
                }
              />
            );
          })}
        </div>
      )}
      {mode === "add" && (
        <AssignDialog
          title="Assign role"
          submitLabel="Assign"
          allowSidEdit
          initialSid=""
          initialType="USER"
          initialRoles={{
            globalRoles: [],
            projectRoles: [],
            slaveRoles: [],
          }}
          rolesByScope={allRolesByScope}
          permissions={bootstrap.permissions}
          existingKeys={new Set(merged.map((m) => `${m.type}:${m.sid}`))}
          onCancel={() => setMode("closed")}
          onSubmit={handleAssign}
        />
      )}
      {editing && (
        <AssignDialog
          title={`Edit assignments: ${editing.sid}`}
          submitLabel="Save"
          allowSidEdit={false}
          initialSid={editing.sid}
          initialType={editing.type}
          initialRoles={editing.roles}
          rolesByScope={allRolesByScope}
          permissions={bootstrap.permissions}
          existingKeys={new Set()}
          onCancel={() => setMode("closed")}
          onSubmit={async (input) => {
            // Diff input.roles vs editing.roles and call assign/unassign per scope.
            for (const scope of SCOPES) {
              const current = new Set(editing.roles[scope.type]);
              const next = new Set(input.roles[scope.type] ?? []);
              for (const r of next) {
                if (!current.has(r)) {
                  await (editing.type === "USER"
                    ? client.assignUserRole(scope.type, r, editing.sid)
                    : client.assignGroupRole(scope.type, r, editing.sid));
                }
              }
              for (const r of current) {
                if (!next.has(r)) {
                  await (editing.type === "USER"
                    ? client.unassignUserRole(scope.type, r, editing.sid)
                    : client.unassignGroupRole(scope.type, r, editing.sid));
                }
              }
            }
            const updated: AssignRolesBootstrap["assignments"] = {
              globalRoles: [...assignments.globalRoles],
              projectRoles: [...assignments.projectRoles],
              slaveRoles: [...assignments.slaveRoles],
            };
            for (const scope of SCOPES) {
              const list = updated[scope.type];
              const idx = list.findIndex(
                (e) => e.sid === editing.sid && e.type === editing.type,
              );
              const newRoles = input.roles[scope.type] ?? [];
              if (newRoles.length === 0) {
                if (idx >= 0) list.splice(idx, 1);
              } else if (idx >= 0) {
                list[idx] = { ...list[idx], roles: newRoles };
              } else {
                list.push({
                  sid: editing.sid,
                  type: editing.type,
                  roles: newRoles,
                });
              }
            }
            replaceAssignments(updated);
            setMode("closed");
          }}
        />
      )}
    </>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 512 512"
      aria-hidden="true"
    >
      <path
        d="M112 112l20 320c.95 18.49 14.4 32 32 32h184c17.67 0 30.87-13.51 32-32l20-320M80 112h352M192 112V72c0-13.3 10.7-24 24-24h80c13.3 0 24 10.7 24 24v40M256 176v224M184 176l8 224M328 176l-8 224"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 512 512"
      aria-hidden="true"
    >
      <path
        d="M384 224v184a40 40 0 01-40 40H104a40 40 0 01-40-40V168a40 40 0 0140-40h152"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <path
        d="M459.94 53.25a16.06 16.06 0 00-23.22-.56L424.4 65a8 8 0 000 11.31l11.32 11.32a8 8 0 0011.31 0l12.24-12.24c6.55-6.55 7.27-17.27.67-23.94zM399.34 90.42L218.82 270.94a9 9 0 00-2.31 3.93L208.16 304a3.91 3.91 0 004.86 4.86l29.13-8.35a9 9 0 003.93-2.31L426.6 117.66a9 9 0 000-12.73l-14.13-14.51a9 9 0 00-13.13 0z"
        fill="currentColor"
      />
    </svg>
  );
}
