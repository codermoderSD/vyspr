import React from "react";

type SpinnerProps = {
  size?: number;
  className?: string;
  "aria-label"?: string;
};

export default function Spinner({
  size = 16,
  className = "",
  "aria-label": aria = "loading",
}: SpinnerProps) {
  return (
    <svg
      role="img"
      aria-label={aria}
      className={`animate-spin inline-block ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.2"
      />
      <path
        d="M22 12a10 10 0 00-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
