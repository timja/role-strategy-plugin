import type { InputHTMLAttributes } from "react";

interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  className?: string;
}

/**
 * Matches the markup that Jenkins core's <l:search-bar> renders so the search
 * icon and padding land in the right place.
 */
export function SearchInput({ className, ...rest }: SearchInputProps) {
  return (
    <div className={`jenkins-search${className ? ` ${className}` : ""}`}>
      <div className="jenkins-search__icon">
        <SearchIcon />
      </div>
      <input
        {...rest}
        type="search"
        className="jenkins-input jenkins-search__input"
      />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      viewBox="0 0 512 512"
    >
      <title />
      <path
        d="M221.09 64a157.09 157.09 0 10157.09 157.09A157.1 157.1 0 00221.09 64z"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32"
      />
      <path
        d="M338.29 338.29L448 448"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="32"
      />
    </svg>
  );
}
