import { readCrumb } from "../utils/crumb.ts";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

function buildSearch(params?: Params): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    qs.append(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

async function ensureOk(response: Response): Promise<Response> {
  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(
      `${response.status} ${response.statusText}`,
      response.status,
      body,
    );
  }
  return response;
}

export async function getJson<T>(url: string, params?: Params): Promise<T> {
  const response = await fetch(`${url}${buildSearch(params)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  await ensureOk(response);
  return (await response.json()) as T;
}

export async function postForm(url: string, params: Params): Promise<void> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    body.append(key, String(value));
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Accept: "application/json, text/plain, */*",
  };
  const crumb = readCrumb();
  if (crumb) {
    headers[crumb.headerName] = crumb.value;
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
    credentials: "same-origin",
  });
  await ensureOk(response);
}
