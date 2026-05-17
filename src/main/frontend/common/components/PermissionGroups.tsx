import { useMemo } from "react";

import type { PermissionGroup } from "../types/permission.ts";
import { computeImpliedPermissions } from "../utils/impliedPermissions.ts";

interface PermissionGroupsProps {
  groups: PermissionGroup[];
  selectedIds: ReadonlySet<string>;
  disabled?: boolean;
  onToggle?: (permissionId: string, next: boolean) => void;
}

export function PermissionGroups({
  groups,
  selectedIds,
  disabled,
  onToggle,
}: PermissionGroupsProps) {
  const flat = useMemo(() => groups.flatMap((g) => g.permissions), [groups]);
  const implied = useMemo(
    () => computeImpliedPermissions(flat, selectedIds),
    [flat, selectedIds],
  );

  return (
    <div className="rsp-perm">
      {groups.map((group) => (
        <fieldset key={group.title} className="rsp-perm__group">
          <legend className="rsp-perm__group-title">{group.title}</legend>
          <div className="rsp-perm__permissions">
            {group.permissions.map((p) => {
              const isImplied = implied.has(p.id);
              const isChecked = selectedIds.has(p.id) || isImplied;
              return (
                <label
                  key={p.id}
                  className="rsp-perm__item"
                  data-permission-id={p.id}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={disabled || isImplied}
                    onChange={(e) => onToggle?.(p.id, e.target.checked)}
                  />
                  <span className="rsp-perm__item-name">{p.name}</span>
                  {isImplied && (
                    <span className="rsp-perm__item-implied">(implied)</span>
                  )}
                  {p.description && (
                    <span
                      className="rsp-perm__item-info"
                      title={p.description}
                      aria-label={p.description}
                    >
                      <HelpIcon />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function HelpIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 512 512"
      aria-hidden="true"
    >
      <circle
        cx="256"
        cy="256"
        r="208"
        fill="none"
        stroke="currentColor"
        strokeWidth="32"
      />
      <path
        d="M160 164s4.4-46 96-46c89.7 0 96 39.8 96 64 0 36.5-37.3 50.2-64 64-19.7 10.2-32 24.8-32 56v8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="32"
      />
      <circle cx="256" cy="416" r="20" fill="currentColor" />
    </svg>
  );
}
