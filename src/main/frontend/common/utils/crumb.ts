export interface Crumb {
  headerName: string;
  value: string;
}

interface JenkinsCrumbGlobal {
  fieldName?: string;
  value?: string;
}

export function readCrumb(): Crumb | null {
  const fromWindow = (window as unknown as { crumb?: JenkinsCrumbGlobal })
    .crumb;
  if (fromWindow?.value) {
    return {
      headerName: fromWindow.fieldName ?? "Jenkins-Crumb",
      value: fromWindow.value,
    };
  }
  const meta = document.head.querySelector<HTMLMetaElement>("meta[name=crumb]");
  if (meta?.content) {
    return {
      headerName:
        meta.getAttribute("data-crumb-request-field") ?? "Jenkins-Crumb",
      value: meta.content,
    };
  }
  return null;
}
