import type { ReactNode } from "react";

import { Tooltip } from "./Tooltip.tsx";

interface HelpIconProps {
  description: ReactNode;
}

/**
 * Help-circle icon with a tooltip showing the description.
 */
export function HelpIcon({ description }: HelpIconProps) {
  return (
    <Tooltip content={description} placement="top" maxWidth={360}>
      <span
        className="rsp-help-icon"
        tabIndex={0}
        aria-label={typeof description === "string" ? description : undefined}
        role="img"
      >
        <HelpCircleSvg />
      </span>
    </Tooltip>
  );
}

function HelpCircleSvg() {
  // Mirrors Jenkins core's "symbol-help-circle" — stroke-based outline,
  // 14px (icon-sm), so it sits inline next to text without dominating.
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 512 512"
      aria-hidden="true"
    >
      <path
        d="M256 80a176 176 0 10176 176A176.5 176.5 0 00256 80z"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32"
      />
      <path
        d="M200 202.29s.84-17.5 19.57-32.57C230.68 160.77 244 158.18 256 158c10.93-.14 20.69 1.67 26.53 4.45 10 4.76 29.47 16.38 29.47 41.09 0 26-17 37.81-36.37 50.8S251 281.43 251 296"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="28"
      />
      <circle cx="250" cy="348" r="20" fill="currentColor" />
    </svg>
  );
}
