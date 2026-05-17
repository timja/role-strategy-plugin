import { useMemo, useState } from "react";

import type { StrategyClient } from "../common/api/strategy.ts";
import { Card } from "../common/components/Card.tsx";
import { PermissionGroups } from "../common/components/PermissionGroups.tsx";
import type { PermissionGroup } from "../common/types/permission.ts";
import type { Role, RoleType } from "../common/types/role.ts";
import type { PermissionTemplate } from "../common/types/template.ts";
import { EditRoleDialog } from "./EditRoleDialog.tsx";

interface RoleCardsProps {
  type: RoleType;
  title: string;
  showPattern: boolean;
  showTemplate: boolean;
  canEdit: boolean;
  permissionGroups: PermissionGroup[];
  roles: Role[];
  templates: PermissionTemplate[];
  search: string;
  filterIds: ReadonlySet<string>;
  emptyTitle: string;
  emptyBody: string;
  onRoleChange: (next: Role[]) => void;
  onError: (message: string | null) => void;
  client: StrategyClient;
}

export function RoleCards({
  type,
  title,
  showPattern,
  showTemplate,
  canEdit,
  permissionGroups,
  roles,
  templates,
  search,
  filterIds,
  emptyTitle,
  emptyBody,
  onRoleChange,
  onError,
  client,
}: RoleCardsProps) {
  const [editing, setEditing] = useState<Role | null>(null);
  const permissionsById = useMemo(() => {
    const m = new Map<string, { name: string; groupTitle: string }>();
    for (const g of permissionGroups) {
      for (const p of g.permissions) {
        m.set(p.id, { name: p.name, groupTitle: g.title });
      }
    }
    return m;
  }, [permissionGroups]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles.filter((role) => {
      const matchesSearch =
        !q ||
        role.name.toLowerCase().includes(q) ||
        (role.pattern ?? "").toLowerCase().includes(q);
      const matchesFilter =
        filterIds.size === 0 ||
        [...filterIds].every((id) => role.permissionIds.includes(id));
      return matchesSearch && matchesFilter;
    });
  }, [roles, search, filterIds]);

  const handleDelete = async (role: Role) => {
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    onError(null);
    try {
      await client.removeRoles(type, [role.name]);
      onRoleChange(roles.filter((r) => r.name !== role.name));
    } catch (err) {
      onError((err as Error).message);
    }
  };

  const handleTogglePermission = async (
    role: Role,
    permissionId: string,
    next: boolean,
  ) => {
    onError(null);
    const selected = new Set(role.permissionIds);
    if (next) selected.add(permissionId);
    else selected.delete(permissionId);
    const nextRole: Role = { ...role, permissionIds: Array.from(selected) };
    const prevRoles = roles;
    onRoleChange(roles.map((r) => (r.name === role.name ? nextRole : r)));
    try {
      await client.addRole({
        type,
        roleName: role.name,
        permissionIds: nextRole.permissionIds,
        overwrite: true,
        pattern: showPattern ? role.pattern : undefined,
        template: role.templateName ?? undefined,
      });
    } catch (err) {
      onRoleChange(prevRoles);
      onError(`Failed to update ${role.name}: ${(err as Error).message}`);
    }
  };

  const handleEditSubmit = async (
    role: Role,
    update: {
      pattern: string;
      permissionIds: string[];
      templateName?: string | null;
    },
  ) => {
    await client.addRole({
      type,
      roleName: role.name,
      permissionIds: update.permissionIds,
      overwrite: true,
      pattern: showPattern ? update.pattern : undefined,
      template: update.templateName ?? undefined,
    });
    onRoleChange(
      roles.map((r) =>
        r.name === role.name
          ? {
              ...r,
              pattern: update.pattern,
              permissionIds: update.permissionIds,
              templateName: update.templateName ?? null,
            }
          : r,
      ),
    );
    setEditing(null);
  };

  const buildSummary = (role: Role) => {
    if (role.permissionIds.length === 0) return null;
    const parts = role.permissionIds
      .map((id) => permissionsById.get(id))
      .filter((p): p is { name: string; groupTitle: string } => !!p)
      .map((p) => `${p.groupTitle}/${p.name}`)
      .sort();
    return parts.join(", ");
  };

  const isFiltering = search.trim() !== "" || filterIds.size > 0;

  return (
    <section className="rsp-container" data-role-type={type}>
      <h2 className="jenkins-section__title">{title}</h2>
      {roles.length === 0 && !isFiltering && (
        <div className="jenkins-notice">
          <div className="jenkins-notice__title">{emptyTitle}</div>
          <div>{emptyBody}</div>
        </div>
      )}
      {roles.length > 0 && filtered.length === 0 && (
        <div className="jenkins-notice rsp-empty-state">No matching roles</div>
      )}
      {filtered.length > 0 && (
        <div className="rsp-cards">
          {filtered.map((role) => {
            const templated = !!role.templateName;
            const badges = (
              <>
                {showTemplate && templated && (
                  <span className="rsp-card__template-badge">
                    {role.templateName}
                  </span>
                )}
              </>
            );
            const actions = canEdit ? (
              <>
                <button
                  type="button"
                  className="jenkins-button jenkins-button--tertiary rsp-card__action"
                  title="Edit role"
                  onClick={() => setEditing(role)}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="jenkins-button jenkins-button--tertiary jenkins-!-destructive-color rsp-card__action"
                  title="Delete role"
                  onClick={() => handleDelete(role)}
                >
                  <TrashIcon />
                </button>
              </>
            ) : undefined;
            return (
              <Card
                key={role.name}
                name={role.name}
                pattern={showPattern ? role.pattern : undefined}
                badges={badges}
                summary={buildSummary(role)}
                actions={actions}
                readOnly={!canEdit}
                body={
                  <PermissionGroups
                    groups={permissionGroups}
                    selectedIds={new Set(role.permissionIds)}
                    disabled={!canEdit || templated}
                    onToggle={(pid, next) =>
                      handleTogglePermission(role, pid, next)
                    }
                  />
                }
              />
            );
          })}
        </div>
      )}
      {editing && (
        <EditRoleDialog
          role={editing}
          permissionGroups={permissionGroups}
          templates={showTemplate ? templates : []}
          showPattern={showPattern}
          onCancel={() => setEditing(null)}
          onSubmit={(update) => handleEditSubmit(editing, update)}
        />
      )}
    </section>
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
        d="M112 112l20 320c.95 18.49 14.4 32 32 32h184c17.67 0 30.87-13.51 32-32l20-320"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <path
        d="M80 112h352M192 112V72c0-13.3 10.7-24 24-24h80c13.3 0 24 10.7 24 24v40M256 176v224M184 176l8 224M328 176l-8 224"
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
