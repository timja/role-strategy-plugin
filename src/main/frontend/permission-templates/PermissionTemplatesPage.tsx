import "../common/styles/role-strategy.scss";

import { useCallback, useMemo, useState } from "react";

import type { StrategyClient } from "../common/api/strategy.ts";
import { useAppBarButton } from "../common/components/AppBarButton.tsx";
import { Card } from "../common/components/Card.tsx";
import { PermissionGroups } from "../common/components/PermissionGroups.tsx";
import { SearchWithFilter } from "../common/components/SearchWithFilter.tsx";
import type { TemplatesBootstrap } from "../common/types/bootstrap.ts";
import type { PermissionTemplate } from "../common/types/template.ts";
import { TemplateDialog } from "./TemplateDialog.tsx";

interface PermissionTemplatesPageProps {
  bootstrap: TemplatesBootstrap;
  client: StrategyClient;
}

export function PermissionTemplatesPage({
  bootstrap,
  client,
}: PermissionTemplatesPageProps) {
  const [templates, setTemplates] = useState<PermissionTemplate[]>(
    bootstrap.templates,
  );
  const [search, setSearch] = useState("");
  const [filterIds, setFilterIds] = useState<ReadonlySet<string>>(new Set());
  const [mode, setMode] = useState<"closed" | "add" | { edit: string }>(
    "closed",
  );
  const [error, setError] = useState<string | null>(null);

  const openAdd = useCallback(() => setMode("add"), []);
  useAppBarButton("rsp-add-template-btn", openAdd);

  const permissionsById = useMemo(() => {
    const m = new Map<string, { name: string; groupTitle: string }>();
    for (const g of bootstrap.permissionGroups) {
      for (const p of g.permissions) {
        m.set(p.id, { name: p.name, groupTitle: g.title });
      }
    }
    return m;
  }, [bootstrap.permissionGroups]);

  const toggleFilter = (id: string) => {
    setFilterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      const matchesSearch = !q || t.name.toLowerCase().includes(q);
      const matchesFilter =
        filterIds.size === 0 ||
        [...filterIds].every((id) => t.permissionIds.includes(id));
      return matchesSearch && matchesFilter;
    });
  }, [templates, search, filterIds]);

  const buildSummary = (template: PermissionTemplate) => {
    if (template.permissionIds.length === 0) return null;
    return template.permissionIds
      .map((id) => permissionsById.get(id))
      .filter((p): p is { name: string; groupTitle: string } => !!p)
      .map((p) => `${p.groupTitle}/${p.name}`)
      .sort()
      .join(", ");
  };

  const handleAdd = async (input: {
    name: string;
    permissionIds: string[];
  }) => {
    await client.addTemplate(input.name, input.permissionIds);
    setTemplates([
      ...templates,
      { name: input.name, permissionIds: input.permissionIds, isUsed: false },
    ]);
    setMode("closed");
  };

  const handleEdit = async (
    target: PermissionTemplate,
    input: { permissionIds: string[] },
  ) => {
    await client.addTemplate(target.name, input.permissionIds);
    setTemplates(
      templates.map((t) =>
        t.name === target.name
          ? { ...t, permissionIds: input.permissionIds }
          : t,
      ),
    );
    setMode("closed");
  };

  const handleDelete = async (template: PermissionTemplate) => {
    if (template.isUsed) {
      setError(`Template "${template.name}" is in use and cannot be deleted.`);
      return;
    }
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    setError(null);
    try {
      await client.removeTemplates([template.name]);
      setTemplates(templates.filter((t) => t.name !== template.name));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const editing =
    typeof mode === "object" && mode.edit
      ? (templates.find((t) => t.name === mode.edit) ?? null)
      : null;

  const isFiltering = search.trim() !== "" || filterIds.size > 0;

  return (
    <>
      {error && (
        <div className="jenkins-alert jenkins-alert-danger jenkins-!-margin-bottom-3">
          {error}
        </div>
      )}
      {templates.length > 0 && (
        <div className="jenkins-!-margin-bottom-3">
          <SearchWithFilter
            searchPlaceholder="Search templates"
            search={search}
            onSearchChange={setSearch}
            filterGroups={bootstrap.permissionGroups}
            selectedFilterIds={filterIds}
            onFilterToggle={toggleFilter}
            onFilterReset={() => setFilterIds(new Set())}
          />
        </div>
      )}
      {templates.length === 0 ? (
        <div className="jenkins-notice">
          <div className="jenkins-notice__title">
            No permission templates defined
          </div>
          {bootstrap.canEdit && (
            <div>Use the Add template button in the toolbar to create one.</div>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="jenkins-notice rsp-empty-state">
          No matching templates
        </div>
      ) : (
        <div className="rsp-cards">
          {filtered.map((template) => (
            <Card
              key={template.name}
              name={template.name}
              badges={
                template.isUsed && (
                  <span className="rsp-card__template-badge">In use</span>
                )
              }
              summary={buildSummary(template)}
              actions={
                bootstrap.canEdit && (
                  <>
                    <button
                      type="button"
                      className="jenkins-button jenkins-button--tertiary rsp-card__action"
                      title="Edit template"
                      onClick={() => setMode({ edit: template.name })}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="jenkins-button jenkins-button--tertiary jenkins-!-destructive-color rsp-card__action"
                      title={
                        template.isUsed
                          ? "Cannot delete a template that is in use"
                          : "Delete template"
                      }
                      disabled={template.isUsed}
                      onClick={() => handleDelete(template)}
                    >
                      <TrashIcon />
                    </button>
                  </>
                )
              }
              readOnly={!bootstrap.canEdit}
              body={
                <PermissionGroups
                  groups={bootstrap.permissionGroups}
                  selectedIds={new Set(template.permissionIds)}
                  disabled
                />
              }
            />
          ))}
        </div>
      )}
      {!isFiltering && templates.length === 0 && null}
      {mode === "add" && (
        <TemplateDialog
          title="Add permission template"
          submitLabel="Add"
          allowNameEdit
          existingNames={new Set(templates.map((t) => t.name))}
          permissionGroups={bootstrap.permissionGroups}
          initialName=""
          initialPermissionIds={[]}
          onCancel={() => setMode("closed")}
          onSubmit={async (input) => handleAdd(input)}
        />
      )}
      {editing && (
        <TemplateDialog
          title={`Edit template: ${editing.name}`}
          submitLabel="Save"
          allowNameEdit={false}
          existingNames={new Set()}
          permissionGroups={bootstrap.permissionGroups}
          initialName={editing.name}
          initialPermissionIds={editing.permissionIds}
          onCancel={() => setMode("closed")}
          onSubmit={async (input) =>
            handleEdit(editing, { permissionIds: input.permissionIds })
          }
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
