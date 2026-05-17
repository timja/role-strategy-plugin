import Tippy from "@tippyjs/react";
import type { ReactNode } from "react";
import "tippy.js/dist/tippy.css";

interface HelpIconProps {
  description: ReactNode;
}

/**
 * Help-circle icon with a Tippy tooltip showing the description.
 * Uses the Ionicons "help-circle-outline" path.
 */
export function HelpIcon({ description }: HelpIconProps) {
  return (
    <Tippy
      content={description}
      placement="top"
      delay={[200, 0]}
      maxWidth={360}
      // Render the tooltip into the nearest <dialog> when inside a modal so
      // it sits in the same top layer; otherwise fall back to document.body.
      appendTo={(reference) => reference.closest("dialog") ?? document.body}
    >
      <span
        className="rsp-help-icon"
        tabIndex={0}
        aria-label={typeof description === "string" ? description : undefined}
        role="img"
      >
        <HelpCircleSvg />
      </span>
    </Tippy>
  );
}

function HelpCircleSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 512 512"
      aria-hidden="true"
    >
      <path
        d="M256 80a176 176 0 10176 176A176.5 176.5 0 00256 80zm-9.8 363.8a20 20 0 1120-20 20 20 0 01-20 20zm38-152.4c-14.5 10-23.3 17.7-23.3 33.3v9.9a8 8 0 01-8 8h-13.8a8 8 0 01-8-8v-8.9c0-25.2 12.3-39.7 33.9-54.4 12.5-8.6 19.6-21.1 19.6-34.8 0-21.6-19.9-39.9-43.5-39.9-22.1 0-44.5 12.4-44.5 39.9v6.8a8 8 0 01-8 8h-13.8a8 8 0 01-8-8v-6.8c0-39.6 33.5-70.9 74.3-70.9 40.5 0 73.7 30.9 73.7 70.9 0 19.9-9.7 36.3-32.6 51.9z"
        fill="currentColor"
      />
    </svg>
  );
}
