import { type FormEvent, useEffect, useState } from "react";

import {
  checkSidName,
  type SidValidationResult,
} from "../common/api/validation.ts";
import { Dialog } from "../common/components/Dialog.tsx";
import { RadioGroup } from "../common/components/RadioGroup.tsx";
import { RoleList } from "../common/components/RoleList.tsx";
import type { AssignRolesBootstrap } from "../common/types/bootstrap.ts";
import type { RoleType } from "../common/types/role.ts";

interface RoleHeader {
  name: string;
  pattern: string;
  permissionLabels?: string[];
}

interface AssignDialogProps {
  title: string;
  submitLabel: string;
  allowSidEdit: boolean;
  initialSid: string;
  initialType: "USER" | "GROUP";
  initialRoles: {
    globalRoles: string[];
    projectRoles: string[];
    slaveRoles: string[];
  };
  rolesByScope: {
    globalRoles: RoleHeader[];
    projectRoles: RoleHeader[];
    slaveRoles: RoleHeader[];
  };
  permissions: AssignRolesBootstrap["permissions"];
  existingKeys: ReadonlySet<string>;
  descriptorUrl?: string;
  onCancel: () => void;
  onSubmit: (input: {
    sid: string;
    type: "USER" | "GROUP";
    roles: Partial<Record<RoleType, string[]>>;
  }) => Promise<void>;
}

const SCOPE_META: {
  type: RoleType;
  title: string;
  showPattern: boolean;
  permKey: "canEditGlobal" | "canEditProject" | "canEditAgent";
}[] = [
  {
    type: "globalRoles",
    title: "Global roles",
    showPattern: false,
    permKey: "canEditGlobal",
  },
  {
    type: "projectRoles",
    title: "Item roles",
    showPattern: true,
    permKey: "canEditProject",
  },
  {
    type: "slaveRoles",
    title: "Agent roles",
    showPattern: true,
    permKey: "canEditAgent",
  },
];

export function AssignDialog({
  title,
  submitLabel,
  allowSidEdit,
  initialSid,
  initialType,
  initialRoles,
  rolesByScope,
  permissions,
  existingKeys,
  descriptorUrl,
  onCancel,
  onSubmit,
}: AssignDialogProps) {
  const [sid, setSid] = useState(initialSid);
  const [kind, setKind] = useState<"USER" | "GROUP">(initialType);
  const [selectedRoles, setSelectedRoles] = useState<
    Record<RoleType, ReadonlySet<string>>
  >({
    globalRoles: new Set(initialRoles.globalRoles),
    projectRoles: new Set(initialRoles.projectRoles),
    slaveRoles: new Set(initialRoles.slaveRoles),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<SidValidationResult | null>(
    null,
  );

  // Debounced lookup of the SID against the security realm as the user types.
  useEffect(() => {
    if (!allowSidEdit || !descriptorUrl) return;
    const value = sid.trim();
    if (value === "") {
      setValidation(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void checkSidName(descriptorUrl, kind, value, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setValidation(result);
        })
        .catch(() => {});
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [allowSidEdit, descriptorUrl, sid, kind]);

  const toggleRole = (scope: RoleType, name: string, next: boolean) => {
    setSelectedRoles((prev) => {
      const ns = new Set(prev[scope]);
      if (next) ns.add(name);
      else ns.delete(name);
      return { ...prev, [scope]: ns };
    });
  };

  const totalSelected =
    selectedRoles.globalRoles.size +
    selectedRoles.projectRoles.size +
    selectedRoles.slaveRoles.size;

  const sidTrim = sid.trim();
  const duplicate =
    allowSidEdit && sidTrim !== "" && existingKeys.has(`${kind}:${sidTrim}`);
  const canSubmit =
    sidTrim !== "" && !duplicate && totalSelected > 0 && !submitting;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        sid: sidTrim,
        type: kind,
        roles: {
          globalRoles: Array.from(selectedRoles.globalRoles),
          projectRoles: Array.from(selectedRoles.projectRoles),
          slaveRoles: Array.from(selectedRoles.slaveRoles),
        },
      });
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  const groups = SCOPE_META.filter(
    (meta) => rolesByScope[meta.type].length > 0,
  ).map((meta) => ({
    type: meta.type,
    title: meta.title,
    showPattern: meta.showPattern,
    roles: rolesByScope[meta.type],
  }));

  const disabledByScope = Object.fromEntries(
    SCOPE_META.map((meta) => [meta.type, !permissions[meta.permKey]]),
  ) as Partial<Record<RoleType, boolean>>;

  return (
    <Dialog
      title={title}
      onClose={onCancel}
      primaryAction={
        <button
          type="button"
          className="jenkins-button jenkins-button--primary"
          onClick={(e) => handleSubmit(e as unknown as FormEvent)}
          disabled={!canSubmit}
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="rsp-dialog__form">
        <div className="jenkins-form-item">
          <label className="jenkins-form-label" htmlFor="rsp-assign-sid">
            {kind === "USER" ? "User ID" : "Group ID"}
          </label>
          <input
            id="rsp-assign-sid"
            type="text"
            className="jenkins-input"
            value={sid}
            onChange={(e) => setSid(e.target.value)}
            disabled={!allowSidEdit}
            autoFocus={allowSidEdit}
            required
          />
          {duplicate && (
            <div className="jenkins-form-description jenkins-!-color-red">
              An assignment for this {kind.toLowerCase()} already exists. Edit
              it from the card instead.
            </div>
          )}
          {!duplicate && validation && sid.trim() !== "" && (
            <div
              className={`jenkins-form-description rsp-assign-validation rsp-assign-validation--${validation.status}`}
            >
              {validation.tooltip ?? validation.displayName ?? sid}
            </div>
          )}
        </div>
        {allowSidEdit && (
          <div className="jenkins-form-item">
            <div className="jenkins-form-label">Type</div>
            <RadioGroup
              name="sidType"
              value={kind}
              options={[
                { value: "USER", label: "User" },
                { value: "GROUP", label: "Group" },
              ]}
              onChange={(next) => setKind(next)}
            />
          </div>
        )}
        <div className="jenkins-form-item">
          <div className="jenkins-form-label">Roles</div>
          {groups.length === 0 ? (
            <div className="rsp-empty-state">
              No roles defined yet. Create roles on the Manage Roles page first.
            </div>
          ) : (
            <RoleList
              groups={groups}
              selectedByScope={selectedRoles}
              disabledByScope={disabledByScope}
              onToggle={toggleRole}
            />
          )}
        </div>
        {error && (
          <div className="jenkins-alert jenkins-alert-danger">{error}</div>
        )}
      </form>
    </Dialog>
  );
}
