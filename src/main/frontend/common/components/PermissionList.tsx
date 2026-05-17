import { useId, useMemo, useState } from "react";

import type { PermissionGroup } from "../types/permission.ts";
import { computeImpliedPermissions } from "../utils/impliedPermissions.ts";
import { SearchInput } from "./SearchInput.tsx";

interface PermissionListProps {
  groups: PermissionGroup[];
  selectedIds: ReadonlySet<string>;
  disabled?: boolean;
  onToggle?: (permissionId: string, next: boolean) => void;
  filterPlaceholder?: string;
}

/**
 * Plain checkbox list of permissions grouped by category — used inside dialogs.
 * The card-body equivalent (pill toggles) is PermissionGroups.
 */
export function PermissionList({
  groups,
  selectedIds,
  disabled,
  onToggle,
  filterPlaceholder = "Filter permissions",
}: PermissionListProps) {
  const idPrefix = useId();
  const [filter, setFilter] = useState("");
  const flat = useMemo(() => groups.flatMap((g) => g.permissions), [groups]);
  const implied = useMemo(
    () => computeImpliedPermissions(flat, selectedIds),
    [flat, selectedIds],
  );

  const q = filter.trim().toLowerCase();
  const visibleGroups = q
    ? groups
        .map((g) => ({
          ...g,
          permissions: g.permissions.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              g.title.toLowerCase().includes(q),
          ),
        }))
        .filter((g) => g.permissions.length > 0)
    : groups;

  return (
    <>
      <SearchInput
        className="jenkins-!-margin-bottom-2"
        placeholder={filterPlaceholder}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="rsp-assign-dialog__roles">
        {visibleGroups.length === 0 && (
          <div
            className="rsp-assign-dialog__no-results"
            style={{
              padding: "1rem",
              textAlign: "center",
              color: "var(--text-color-secondary)",
              fontStyle: "italic",
            }}
          >
            No matching permissions
          </div>
        )}
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <div className="rsp-assign-dialog__group-title">{group.title}</div>
            <div className="rsp-assign-dialog__group">
              {group.permissions.map((p) => {
                const isImplied = implied.has(p.id);
                const isChecked = selectedIds.has(p.id) || isImplied;
                const inputId = `${idPrefix}-${p.id}`;
                return (
                  <div
                    key={p.id}
                    className="rsp-assign-dialog__role-item jenkins-checkbox"
                    data-permission-id={p.id}
                  >
                    <input
                      type="checkbox"
                      id={inputId}
                      checked={isChecked}
                      disabled={disabled || isImplied}
                      onChange={(e) => onToggle?.(p.id, e.target.checked)}
                    />
                    <label htmlFor={inputId}>
                      {p.name}
                      {isImplied && (
                        <span className="rsp-implied-label"> (implied)</span>
                      )}
                    </label>
                    {p.description && (
                      <span
                        className="rsp-perm-info"
                        title={p.description}
                        aria-label={p.description}
                      >
                        <HelpIcon />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
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
