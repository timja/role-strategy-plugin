import { readCrumb } from "../utils/crumb.ts";

export type SidValidationStatus = "ok" | "ambiguous" | "not_found";

export interface SidValidationResult {
  status: SidValidationStatus;
  /** Display name extracted from the validation HTML, falling back to the SID. */
  displayName?: string;
  /** Tooltip text from the response, useful for inline feedback. */
  tooltip?: string;
}

/**
 * Calls the strategy descriptor's checkName endpoint and maps the returned
 * HTML to a status. The HTML format comes from ValidationUtil.java.
 */
export async function checkSidName(
  descriptorUrl: string,
  type: "USER" | "GROUP",
  sid: string,
  signal?: AbortSignal,
): Promise<SidValidationResult> {
  const value = `[${type}:${sid}]`;
  const url = `${descriptorUrl}/checkName`;
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Accept: "text/html",
  };
  const crumb = readCrumb();
  if (crumb) headers[crumb.headerName] = crumb.value;

  const body = `value=${encodeURIComponent(value)}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) {
    return { status: "ok", displayName: sid };
  }
  const html = await response.text();
  return parseValidationResponse(html, sid);
}

export function parseValidationResponse(
  html: string,
  fallback: string,
): SidValidationResult {
  const status: SidValidationStatus = html.includes("rsp-entry-not-found")
    ? "not_found"
    : html.includes("rsp-table__icon-alert")
      ? "ambiguous"
      : "ok";

  let displayName = fallback;
  let tooltip: string | undefined;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const cell = doc.querySelector(".rsp-table__cell");
    if (cell) {
      const attr = cell.getAttribute("tooltip");
      // Guard against the literal string "undefined" sneaking in from a
      // legacy format string on the backend.
      if (attr && attr !== "undefined") tooltip = attr;
      // Strip the SVG icons; whatever text is left is the display name.
      cell.querySelectorAll("svg").forEach((s) => s.remove());
      const text = (cell.textContent ?? "").trim();
      if (text) displayName = text;
    }
  } catch {
    // ignore parsing failures and keep the fallback
  }
  // Always return a useful tooltip — the descriptor doesn't always include
  // one in the HTML response, so fall back to a status-appropriate message
  // instead of leaving the field undefined (which renders as the string
  // "undefined" in some browsers).
  if (!tooltip) {
    if (status === "ambiguous") {
      tooltip = "Matches both a user and a group in the security realm.";
    } else if (status === "not_found") {
      tooltip = "Not found in the security realm.";
    } else {
      tooltip = displayName;
    }
  }
  return { status, displayName, tooltip };
}

export async function validateSids(
  descriptorUrl: string,
  entries: ReadonlyArray<{ type: "USER" | "GROUP"; sid: string }>,
  signal?: AbortSignal,
  onResult?: (
    entry: { type: "USER" | "GROUP"; sid: string },
    result: SidValidationResult,
  ) => void,
): Promise<void> {
  const concurrency = 6;
  let i = 0;
  const next = async (): Promise<void> => {
    if (signal?.aborted) return;
    const idx = i++;
    if (idx >= entries.length) return;
    const entry = entries[idx];
    try {
      const result = await checkSidName(
        descriptorUrl,
        entry.type,
        entry.sid,
        signal,
      );
      onResult?.(entry, result);
    } catch {
      // ignore individual failures
    }
    return next();
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, entries.length) }, () => next()),
  );
}
