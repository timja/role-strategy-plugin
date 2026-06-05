import type { Permission } from "../types/permission.ts";

export function computeImpliedPermissions(
  permissions: Permission[],
  selectedIds: ReadonlySet<string>,
): Set<string> {
  const byId = new Map(permissions.map((p) => [p.id, p]));
  const impliedBy = new Map<string, string[]>();
  for (const p of permissions) {
    impliedBy.set(p.id, p.impliedByList ?? []);
  }

  const implied = new Set<string>();
  const visit = (id: string) => {
    const parents = impliedBy.get(id) ?? [];
    for (const parent of parents) {
      if (!byId.has(parent)) continue;
      if (selectedIds.has(parent) && !implied.has(id)) {
        implied.add(id);
      }
      if (implied.has(parent)) {
        implied.add(id);
      }
    }
  };

  let changed = true;
  while (changed) {
    changed = false;
    const before = implied.size;
    for (const p of permissions) {
      visit(p.id);
    }
    if (implied.size !== before) changed = true;
  }

  return implied;
}
