import { useId, useMemo, useState } from "react";

import type { RoleType } from "../types/role.ts";
import { HelpIcon } from "./HelpIcon.tsx";
import { SearchInput } from "./SearchInput.tsx";

interface RoleHeader {
  name: string;
  pattern: string;
  permissionLabels?: string[];
}

interface RoleGroup {
  type: RoleType;
  title: string;
  showPattern: boolean;
  roles: RoleHeader[];
}

interface RoleListProps {
  groups: RoleGroup[];
  selectedByScope: Record<RoleType, ReadonlySet<string>>;
  disabledByScope?: Partial<Record<RoleType, boolean>>;
  onToggle: (scope: RoleType, roleName: string, next: boolean) => void;
  filterPlaceholder?: string;
}

/**
 * Plain checkbox list of roles, grouped by scope (Global / Item / Agent).
 * Used inside the Assign Role dialog.
 */
export function RoleList({
  groups,
  selectedByScope,
  disabledByScope = {},
  onToggle,
  filterPlaceholder = "Filter roles",
}: RoleListProps) {
  const idPrefix = useId();
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();

  const visible = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        roles: g.roles.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.pattern.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.roles.length > 0);
  }, [groups, q]);

  return (
    <>
      <SearchInput
        className="jenkins-!-margin-bottom-2"
        placeholder={filterPlaceholder}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="rsp-assign-dialog__roles">
        {visible.length === 0 && (
          <div
            className="rsp-assign-dialog__no-results"
            style={{
              padding: "1rem",
              textAlign: "center",
              color: "var(--text-color-secondary)",
              fontStyle: "italic",
            }}
          >
            No matching roles
          </div>
        )}
        {visible.map((group) => (
          <div key={group.type}>
            <div className="rsp-assign-dialog__group-title">{group.title}</div>
            <div className="rsp-assign-dialog__group">
              {group.roles.map((role) => {
                const inputId = `${idPrefix}-${group.type}-${role.name}`;
                const isChecked = selectedByScope[group.type].has(role.name);
                const isDisabled = disabledByScope[group.type] ?? false;
                return (
                  <div
                    key={role.name}
                    className="rsp-assign-dialog__role-item jenkins-checkbox"
                    data-role-name={role.name}
                  >
                    <input
                      type="checkbox"
                      id={inputId}
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={(e) =>
                        onToggle(group.type, role.name, e.target.checked)
                      }
                    />
                    <label htmlFor={inputId}>{role.name}</label>
                    {group.showPattern && role.pattern && (
                      <span className="rsp-assign-dialog__role-pattern">
                        &quot;{role.pattern}&quot;
                      </span>
                    )}
                    {role.permissionLabels &&
                      role.permissionLabels.length > 0 && (
                        <HelpIcon
                          description={
                            <RolePermissionsTooltip
                              labels={role.permissionLabels}
                            />
                          }
                        />
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

function RolePermissionsTooltip({ labels }: { labels: string[] }) {
  return (
    <div>
      <strong>Permissions</strong>
      <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.1rem" }}>
        {labels.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  );
}
