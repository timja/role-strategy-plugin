import { Tooltip } from "./Tooltip.tsx";

type SidStatus = "USER" | "GROUP" | "AMBIGUOUS" | "NOT_FOUND";

interface SidIconProps {
  type: "USER" | "GROUP" | "EITHER";
  status?: SidStatus;
}

/**
 * Renders the user / group icon, with an extra warning glyph next to it when
 * the SID didn't resolve in the security realm or is ambiguous. SIDs stored
 * with type "EITHER" (legacy / ambiguous assignments) implicitly carry an
 * AMBIGUOUS indicator even when checkName didn't flag them.
 */
export function SidIcon({ type, status }: SidIconProps) {
  // Resolve to the "real" type icon. For an EITHER assignment we default to
  // the people icon — admins resolving an ambiguity usually want the broader
  // glyph until they pick USER or GROUP explicitly.
  const typeIcon = type === "USER" ? <PersonIcon /> : <PeopleIcon />;
  const effectiveStatus: SidStatus | undefined =
    status ?? (type === "EITHER" ? "AMBIGUOUS" : undefined);
  const indicator =
    effectiveStatus === "NOT_FOUND" || effectiveStatus === "AMBIGUOUS"
      ? effectiveStatus
      : null;
  const indicatorIcon =
    indicator === "NOT_FOUND" ? (
      <WarningIcon />
    ) : indicator === "AMBIGUOUS" ? (
      <HelpIcon />
    ) : null;
  const label = TYPE_LABEL[type] ?? "SID";
  const tooltip =
    indicator === "NOT_FOUND"
      ? `${label} — not found in the security realm`
      : indicator === "AMBIGUOUS"
        ? `${label} — ambiguous (matches both a user and a group)`
        : label;

  return (
    <Tooltip content={tooltip} placement="top">
      <span
        className={`rsp-sid-icon rsp-sid-icon--${type.toLowerCase()}${
          indicator ? ` rsp-sid-icon--${indicator.toLowerCase()}` : ""
        }`}
        aria-label={tooltip}
        role="img"
      >
        {/* Always render the indicator slot — even empty — so a validation
            result arriving in doesn't shift card content sideways. */}
        <span className="rsp-sid-icon__indicator">{indicatorIcon}</span>
        {typeIcon}
      </span>
    </Tooltip>
  );
}

const TYPE_LABEL: Record<string, string> = {
  USER: "User",
  GROUP: "Group",
  EITHER: "Ambiguous SID",
};

function PersonIcon() {
  return (
    <svg viewBox="0 0 512 512" width="16" height="16" aria-hidden="true">
      <path
        d="M344 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <path
        d="M256 304c-87 0-175.3 48-191.64 138.6C62.39 453.52 68.57 464 80 464h352c11.44 0 17.62-10.48 15.65-21.4C431.3 352 343 304 256 304z"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32"
      />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 512 512" width="16" height="16" aria-hidden="true">
      <path
        d="M402 168c-2.93 40.67-33.1 72-66 72s-63.12-31.32-66-72c-3-42.31 26.37-72 66-72s69 30.46 66 72z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <path
        d="M336 304c-65.17 0-127.84 32.37-143.54 95.41-2.08 8.34 3.15 16.59 11.72 16.59h263.65c8.57 0 13.77-8.25 11.72-16.59C463.85 335.36 401.18 304 336 304z"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32"
      />
      <path
        d="M200 185c-2.34 32.45-26.72 58-53 58s-50.7-25.55-53-58c-2.4-33.75 21-58 53-58s55.4 24.85 53 58z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <path
        d="M168 271c-32.13 0-62.39 13.65-78.07 41-7 12.17-1 27 12.6 27h84.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="32"
      />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 512 512" width="14" height="14" aria-hidden="true">
      <path
        d="M256 80a176 176 0 10176 176A176.5 176.5 0 00256 80zm-9.8 363.8a20 20 0 1120-20 20 20 0 01-20 20zm38-152.4c-14.5 10-23.3 17.7-23.3 33.3v9.9a8 8 0 01-8 8h-13.8a8 8 0 01-8-8v-8.9c0-25.2 12.3-39.7 33.9-54.4 12.5-8.6 19.6-21.1 19.6-34.8 0-21.6-19.9-39.9-43.5-39.9-22.1 0-44.5 12.4-44.5 39.9v6.8a8 8 0 01-8 8h-13.8a8 8 0 01-8-8v-6.8c0-39.6 33.5-70.9 74.3-70.9 40.5 0 73.7 30.9 73.7 70.9 0 19.9-9.7 36.3-32.6 51.9z"
        fill="currentColor"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 512 512" width="14" height="14" aria-hidden="true">
      <path
        d="M449.07 399.08L278.64 82.58c-12.08-22.44-44.26-22.44-56.35 0L51.87 399.08A32 32 0 0080 446.25h340.89a32 32 0 0028.18-47.17zm-198.6-1.83a20 20 0 1120-20 20 20 0 01-20 20zm21.72-201.15l-5.74 122a16 16 0 01-32 0l-5.74-121.95a21.73 21.73 0 0121.5-22.69h.21a21.74 21.74 0 0121.73 22.7z"
        fill="currentColor"
      />
    </svg>
  );
}
