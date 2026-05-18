import "../common/styles/role-strategy.scss";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { StrategyClient } from "../common/api/strategy.ts";
import {
  type SidValidationResult,
  validateSids,
} from "../common/api/validation.ts";
import { useAppBarButton } from "../common/components/AppBarButton.tsx";
import { Card } from "../common/components/Card.tsx";
import { IconButton } from "../common/components/IconButton.tsx";
import { SearchWithFilter } from "../common/components/SearchWithFilter.tsx";
import { SidIcon } from "../common/components/SidIcon.tsx";
import type {
  AssignedSid,
  AssignRolesBootstrap,
} from "../common/types/bootstrap.ts";
import type { PermissionGroup } from "../common/types/permission.ts";
import type { RoleType } from "../common/types/role.ts";
import { confirmAction } from "../common/utils/confirm.ts";
import { AssignDialog } from "./AssignDialog.tsx";

interface AssignRolesPageProps {
  bootstrap: AssignRolesBootstrap;
  canEdit: boolean;
  client: StrategyClient;
  descriptorUrl: string;
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
  descriptorUrl,
}: AssignRolesPageProps) {
  const [assignments, setAssignments] = useState(bootstrap.assignments);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<
    "closed" | "add" | { edit: string; type: "USER" | "GROUP" }
  >("closed");
  const [error, setError] = useState<string | null>(null);

  const openAdd = useCallback(() => setMode("add"), []);
  useAppBarButton("rsp-assign-role-btn", openAdd);

  const [validationStatus, setValidationStatus] = useState<
    Record<string, SidValidationResult>
  >({});

  const merged: MergedSid[] = useMemo(() => {
    const map = new Map<string, MergedSid>();
    // Anonymous (USER) and Authenticated (GROUP) are Jenkins built-in
    // principals — always show them at the top, even when no roles are
    // assigned, so admins can grant baseline access without first guessing
    // the SID.
    const builtIns: { sid: string; type: "USER" | "GROUP" }[] = [
      { sid: "anonymous", type: "USER" },
      { sid: "authenticated", type: "GROUP" },
    ];
    for (const b of builtIns) {
      const key = `${b.type}:${b.sid}`;
      map.set(key, {
        sid: b.sid,
        type: b.type,
        roles: { globalRoles: [], projectRoles: [], slaveRoles: [] },
      });
    }
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
    const all = Array.from(map.values());
    const builtInRank = (m: MergedSid) =>
      m.type === "USER" && m.sid === "anonymous"
        ? 0
        : m.type === "GROUP" && m.sid === "authenticated"
          ? 1
          : 2;
    return all.sort((a, b) => {
      const ra = builtInRank(a);
      const rb = builtInRank(b);
      if (ra !== rb) return ra - rb;
      return a.sid.localeCompare(b.sid);
    });
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
    const ok = await confirmAction(
      `Remove all assignments for ${sid.type.toLowerCase()} "${sid.sid}"?`,
      "Remove",
    );
    if (!ok) return;
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

  // Paginate to keep the DOM small when there are many SIDs. Reset to page 0
  // whenever the active set changes (search/filter/data updates).
  const PAGE_SIZE = 100;
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [search, filterIds, merged.length]);
  const totalPages = Math.max(1, Math.ceil(filteredByRoles.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filteredByRoles.length);
  const pageItems = useMemo(
    () => filteredByRoles.slice(pageStart, pageEnd),
    [filteredByRoles, pageStart, pageEnd],
  );

  // Validate SIDs against the security realm — but only for the items
  // visible on the current page. With thousands of assignments, validating
  // all of them up-front floods the descriptor's checkName endpoint.
  useEffect(() => {
    if (!descriptorUrl) return;
    const toCheck = pageItems
      .filter((m) => !validationStatus[`${m.type}:${m.sid}`])
      .map((m) => ({ type: m.type, sid: m.sid }));
    if (toCheck.length === 0) return;
    const controller = new AbortController();
    void validateSids(
      descriptorUrl,
      toCheck,
      controller.signal,
      (entry, result) => {
        setValidationStatus((prev) => ({
          ...prev,
          [`${entry.type}:${entry.sid}`]: result,
        }));
      },
    );
    return () => controller.abort();
    // Intentionally exclude validationStatus from deps — we only want to
    // kick off validation when the visible page changes, not on every
    // result that comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptorUrl, pageItems]);

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
        <>
          <div className="rsp-result-count">
            {filteredByRoles.length.toLocaleString()}{" "}
            {filteredByRoles.length === 1 ? "result" : "results"}
            {filteredByRoles.length !== merged.length
              ? ` (of ${merged.length.toLocaleString()})`
              : ""}
          </div>
          <div className="rsp-cards">
            {pageItems.map((m) => {
              const summaryParts: string[] = [];
              for (const scope of SCOPES) {
                for (const r of m.roles[scope.type]) {
                  summaryParts.push(`${scope.label}/${r}`);
                }
              }
              const isUser = m.type === "USER";
              const isBuiltIn =
                (m.type === "USER" && m.sid === "anonymous") ||
                (m.type === "GROUP" && m.sid === "authenticated");
              const v = validationStatus[`${m.type}:${m.sid}`];
              const builtInName =
                m.type === "USER" && m.sid === "anonymous"
                  ? "Anonymous"
                  : m.type === "GROUP" && m.sid === "authenticated"
                    ? "Authenticated Users"
                    : null;
              const displayName =
                builtInName ??
                (v?.displayName && v.status !== "not_found"
                  ? v.displayName
                  : m.sid);
              const status =
                v?.status === "not_found"
                  ? "NOT_FOUND"
                  : v?.status === "ambiguous"
                    ? "AMBIGUOUS"
                    : undefined;
              return (
                <Card
                  key={`${m.type}:${m.sid}`}
                  name={displayName}
                  nameTooltip={displayName !== m.sid ? m.sid : undefined}
                  className={
                    status === "AMBIGUOUS"
                      ? "rsp-card--ambiguous"
                      : status === "NOT_FOUND"
                        ? "rsp-card--not-found"
                        : undefined
                  }
                  leadingIcon={<SidIcon type={m.type} status={status} />}
                  summary={summaryParts.sort().join(", ") || null}
                  actions={
                    canEdit && (
                      <>
                        <IconButton
                          tooltip="Edit assignments"
                          onClick={() => setMode({ edit: m.sid, type: m.type })}
                          icon={<EditIcon />}
                        />
                        {!isBuiltIn && (
                          <IconButton
                            tooltip="Remove from all scopes"
                            destructive
                            onClick={() => handleDeleteSid(m)}
                            icon={<TrashIcon />}
                          />
                        )}
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
                          <fieldset
                            key={scope.type}
                            className="rsp-perm__group"
                          >
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
          {totalPages > 1 && (
            <div className="rsp-pagination">
              <button
                type="button"
                className="jenkins-button jenkins-button--tertiary"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <span className="rsp-pagination__status">
                {(pageStart + 1).toLocaleString()}–{pageEnd.toLocaleString()} of{" "}
                {filteredByRoles.length.toLocaleString()}
              </span>
              <button
                type="button"
                className="jenkins-button jenkins-button--tertiary"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </>
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
          descriptorUrl={descriptorUrl}
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
          descriptorUrl={descriptorUrl}
          onCancel={() => setMode("closed")}
          onSubmit={async (input) => {
            const typeChanged = input.type !== editing.type;
            if (typeChanged) {
              // Migration: unassign all under the old type, then
              // assign all under the new type. The user explicitly
              // chose a different SID type to resolve ambiguity.
              for (const scope of SCOPES) {
                for (const r of editing.roles[scope.type]) {
                  await (editing.type === "USER"
                    ? client.unassignUserRole(scope.type, r, editing.sid)
                    : client.unassignGroupRole(scope.type, r, editing.sid));
                }
                for (const r of input.roles[scope.type] ?? []) {
                  await (input.type === "USER"
                    ? client.assignUserRole(scope.type, r, editing.sid)
                    : client.assignGroupRole(scope.type, r, editing.sid));
                }
              }
            } else {
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
            }
            const updated: AssignRolesBootstrap["assignments"] = {
              globalRoles: [...assignments.globalRoles],
              projectRoles: [...assignments.projectRoles],
              slaveRoles: [...assignments.slaveRoles],
            };
            for (const scope of SCOPES) {
              const list = updated[scope.type];
              // Remove any old-type entry for this SID.
              for (let i = list.length - 1; i >= 0; i--) {
                if (
                  list[i].sid === editing.sid &&
                  list[i].type === editing.type
                ) {
                  list.splice(i, 1);
                }
              }
              const newRoles = input.roles[scope.type] ?? [];
              if (newRoles.length > 0) {
                const idx = list.findIndex(
                  (e) => e.sid === editing.sid && e.type === input.type,
                );
                if (idx >= 0) {
                  list[idx] = { ...list[idx], roles: newRoles };
                } else {
                  list.push({
                    sid: editing.sid,
                    type: input.type,
                    roles: newRoles,
                  });
                }
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
  // Ionicons "create-outline" — a pencil.
  return (
    <svg
      width="512px"
      height="512px"
      viewBox="0 0 512 512"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Edit</title>
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <path
          d="M399.608914,57 C413.784791,57 427.960684,62.4078333 438.776426,73.2235621 C449.592141,84.0392638 455,98.2149574 455,112.390686 C455,126.566468 449.592105,140.742274 438.776426,151.558078 L438.776426,151.558078 L191.040603,399.293596 C182.232434,408.101755 171.575528,414.840664 159.841736,419.022244 L159.841736,419.022244 L58.9309718,454.983885 C58.3980325,455.005817 57.9083807,454.793595 57.5574476,454.442654 C57.2063668,454.091565 56.9941379,453.601684 57.0161199,453.068522 L57.0161199,453.068522 L92.977296,352.157786 C97.1588787,340.423838 103.897856,329.766792 112.706129,320.958529 L112.706129,320.958529 L360.441401,73.2235621 C371.257143,62.4078333 385.433036,57 399.608914,57 Z"
          stroke="currentColor"
          stroke-width="32"
          fill-rule="nonzero"
        ></path>
        <polyline
          fill="currentColor"
          transform="translate(362.692388, 154.192388) rotate(45.000000) translate(-362.692388, -154.192388) "
          points="308.192388 138.192388 359.945436 138.192388 417.192388 138.192388 417.192388 170.192388 360.652543 170.192388 308.192388 170.192388"
        ></polyline>
      </g>
    </svg>
  );
}
