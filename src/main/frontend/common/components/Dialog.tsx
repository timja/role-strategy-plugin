import { type ReactNode, useLayoutEffect, useRef } from "react";

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  primaryAction?: ReactNode;
}

export function Dialog({
  title,
  onClose,
  children,
  primaryAction,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Remember the page scroll before opening the dialog. `showModal()` and
    // focus-into-view behaviours can push the page to scroll the dialog or
    // its first focusable child into view, which is jarring when the dialog
    // sits in the top layer and shouldn't affect page position.
    const x = window.scrollX;
    const y = window.scrollY;
    if (!node.open) {
      node.showModal();
    }
    // Focus a flagged element ourselves with preventScroll so the browser
    // doesn't drag the page to it. Browsers don't honour preventScroll on
    // the native `autoFocus` attribute, which is why callers tag their
    // initial focus target with `data-autofocus="true"` instead.
    const focusTarget = node.querySelector<HTMLElement>('[data-autofocus="true"]');
    focusTarget?.focus({ preventScroll: true });
    // Restore twice — once synchronously, once after the next frame — to
    // beat any late "scroll into view" the browser performs after the
    // dialog enters the top layer.
    window.scrollTo(x, y);
    const raf = requestAnimationFrame(() => window.scrollTo(x, y));
    // The browser fires "cancel" when ESC is pressed; let it close.
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    node.addEventListener("cancel", onCancel);
    return () => {
      cancelAnimationFrame(raf);
      node.removeEventListener("cancel", onCancel);
      if (node.open) node.close();
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className="jenkins-dialog rsp-dialog"
      // No backdrop-click-to-close — the close button is the only dismissal.
    >
      <div className="rsp-dialog__header">
        <div className="jenkins-dialog__title">
          {title}{" "}
          <button
            type="button"
            aria-label="Close"
            className="jenkins-dialog__title__button jenkins-dialog__title__close-button jenkins-button"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      <div className="jenkins-dialog__contents">
        {children}
        {primaryAction && (
          <>
            <div className="jenkins-bottom-app-bar__shadow jenkins-bottom-app-bar__shadow--borderless jenkins-bottom-app-bar__shadow--stuck" />
            <div id="bottom-sticker" className="bottom-sticker">
              <div className="bottom-sticker-inner jenkins-buttons-row jenkins-buttons-row--equal-width">
                {primaryAction}
              </div>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 512 512"
      aria-hidden="true"
    >
      <path
        d="M368 368L144 144M368 144L144 368"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="48"
      />
    </svg>
  );
}
