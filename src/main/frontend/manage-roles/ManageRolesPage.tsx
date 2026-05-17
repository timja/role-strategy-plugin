import "../common/styles/role-strategy.scss";

import { useCallback, useMemo, useState } from "react";

import type { StrategyClient } from "../common/api/strategy.ts";
import { useAppBarButton } from "../common/components/AppBarButton.tsx";
import { SearchWithFilter } from "../common/components/SearchWithFilter.tsx";
import type {
  BootstrapPermissionGroups,
  ManageRolesBootstrap,
} from "../common/types/bootstrap.ts";
import type { Role, RoleType } from "../common/types/role.ts";
import { AddRoleDialog } from "./AddRoleDialog.tsx";
import { RoleCards } from "./RoleCards.tsx";

interface ManageRolesPageProps {
  permissionGroups: BootstrapPermissionGroups;
  bootstrap: ManageRolesBootstrap;
  client: StrategyClient;
  listMacrosUrl: string;
}

const SECTIONS: {
  type: RoleType;
  title: string;
  showPattern: boolean;
  showTemplate: boolean;
  canEditKey: "canEditGlobal" | "canEditProject" | "canEditAgent";
  emptyTitle: string;
  emptyBody: string;
}[] = [
  {
    type: "globalRoles",
    title: "Global roles",
    showPattern: false,
    showTemplate: false,
    canEditKey: "canEditGlobal",
    emptyTitle: "No global roles defined",
    emptyBody: "Use Add role to create a global role.",
  },
  {
    type: "projectRoles",
    title: "Item roles",
    showPattern: true,
    showTemplate: true,
    canEditKey: "canEditProject",
    emptyTitle: "No item roles defined",
    emptyBody: "Use Add role to create an item role.",
  },
  {
    type: "slaveRoles",
    title: "Agent roles",
    showPattern: true,
    showTemplate: false,
    canEditKey: "canEditAgent",
    emptyTitle: "No agent roles defined",
    emptyBody: "Use Add role to create an agent role.",
  },
];

export function ManageRolesPage({
  permissionGroups,
  bootstrap,
  client,
  listMacrosUrl,
}: ManageRolesPageProps) {
  const [roles, setRoles] = useState(bootstrap.roles);
  const [search, setSearch] = useState("");
  const [filterIds, setFilterIds] = useState<ReadonlySet<string>>(new Set());
  const [isAddOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdd = useCallback(() => setAddOpen(true), []);
  useAppBarButton("rsp-add-role-btn", openAdd);

  const allFilterGroups = useMemo(() => {
    const seen = new Map<string, { title: string; ids: Set<string> }>();
    const merged: typeof permissionGroups.globalRoles = [];
    for (const list of [
      permissionGroups.globalRoles,
      permissionGroups.projectRoles,
      permissionGroups.slaveRoles,
    ]) {
      for (const g of list) {
        let entry = seen.get(g.title);
        if (!entry) {
          entry = { title: g.title, ids: new Set() };
          seen.set(g.title, entry);
          merged.push({ title: g.title, permissions: [] });
        }
        const target = merged.find((m) => m.title === g.title)!;
        for (const p of g.permissions) {
          if (!entry.ids.has(p.id)) {
            entry.ids.add(p.id);
            target.permissions.push(p);
          }
        }
      }
    }
    return merged;
  }, [permissionGroups]);

  const replaceRoles = (type: RoleType, next: Role[]) => {
    setRoles((prev) => ({ ...prev, [type]: next }));
  };

  const toggleFilter = (id: string) => {
    setFilterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async (input: {
    type: RoleType;
    name: string;
    pattern: string;
    permissionIds: string[];
    templateName?: string;
  }) => {
    await client.addRole({
      type: input.type,
      roleName: input.name,
      permissionIds: input.permissionIds,
      overwrite: false,
      pattern: input.type !== "globalRoles" ? input.pattern : undefined,
      template: input.templateName,
    });
    const showPattern = input.type !== "globalRoles";
    const newRole: Role = {
      name: input.name,
      pattern: showPattern ? input.pattern : ".*",
      permissionIds: input.permissionIds,
      templateName: input.templateName ?? null,
      sids: [],
    };
    replaceRoles(input.type, [...roles[input.type], newRole]);
    setAddOpen(false);
  };

  return (
    <>
      {error && (
        <div className="jenkins-alert jenkins-alert-danger jenkins-!-margin-bottom-3">
          {error}
        </div>
      )}
      <div className="jenkins-!-margin-bottom-3">
        <SearchWithFilter
          searchPlaceholder="Search roles"
          search={search}
          onSearchChange={setSearch}
          filterGroups={allFilterGroups}
          filterLabel="Filter by permission"
          selectedFilterIds={filterIds}
          onFilterToggle={toggleFilter}
          onFilterReset={() => setFilterIds(new Set())}
        />
      </div>
      {SECTIONS.map((section) => (
        <RoleCards
          key={section.type}
          type={section.type}
          title={section.title}
          showPattern={section.showPattern}
          showTemplate={section.showTemplate}
          canEdit={bootstrap.permissions[section.canEditKey]}
          permissionGroups={permissionGroups[section.type]}
          roles={roles[section.type]}
          templates={bootstrap.permissionTemplates}
          search={search}
          filterIds={filterIds}
          emptyTitle={section.emptyTitle}
          emptyBody={section.emptyBody}
          onRoleChange={(next) => replaceRoles(section.type, next)}
          onError={setError}
          client={client}
        />
      ))}
      {isAddOpen && (
        <AddRoleDialog
          permissionGroups={permissionGroups}
          templates={bootstrap.permissionTemplates}
          permissions={bootstrap.permissions}
          listMacrosUrl={listMacrosUrl}
          onCancel={() => setAddOpen(false)}
          onSubmit={handleAdd}
        />
      )}
    </>
  );
}
