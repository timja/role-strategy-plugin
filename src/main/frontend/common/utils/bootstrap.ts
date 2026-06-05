export function readBootstrap<T>(mountNode: HTMLElement, attrName: string): T {
  const raw = mountNode.getAttribute(attrName);
  if (!raw) {
    throw new Error(
      `Missing ${attrName} bootstrap attribute on #${mountNode.id}`,
    );
  }
  return JSON.parse(raw) as T;
}

export function readBootstrapFromScript<T>(scriptId: string): T {
  const node = document.getElementById(scriptId);
  if (!node) {
    throw new Error(`Missing bootstrap script #${scriptId}`);
  }
  return JSON.parse(node.textContent ?? "") as T;
}
