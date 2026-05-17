import Tippy from "@tippyjs/react";
import type { ReactNode } from "react";

interface IconButtonProps {
  tooltip: string;
  icon: ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

/**
 * Icon-only Jenkins tertiary button with a Tippy tooltip.
 */
export function IconButton({
  tooltip,
  icon,
  onClick,
  destructive,
  disabled,
}: IconButtonProps) {
  return (
    <Tippy
      content={tooltip}
      placement="top"
      delay={[200, 0]}
      appendTo={(reference) => reference.closest("dialog") ?? document.body}
    >
      <button
        type="button"
        className={`jenkins-button jenkins-button--tertiary rsp-card__action${
          destructive ? " jenkins-!-destructive-color" : ""
        }`}
        aria-label={tooltip}
        disabled={disabled}
        onClick={onClick}
      >
        {icon}
      </button>
    </Tippy>
  );
}
