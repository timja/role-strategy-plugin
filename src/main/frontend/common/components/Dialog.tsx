import { type ReactNode, useEffect, useRef } from "react";

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

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!node.open) {
      node.showModal();
    }
    // The browser fires "cancel" when ESC is pressed; let it close.
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    node.addEventListener("cancel", onCancel);
    return () => {
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
