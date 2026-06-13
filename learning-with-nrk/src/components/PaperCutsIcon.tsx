import React from "react";

export function PaperCutsIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <g transform="rotate(12 7 7.5)">
        <rect x="4.5" y="4.5" width="5" height="6" rx="0.5" />
        <path d="M5.5 6.5h3" />
        <path d="M5.5 8.5h2" />
      </g>
      <g transform="rotate(-15 16.5 6.5)">
        <rect x="13.5" y="3" width="6" height="7" rx="0.5" />
        <path d="M14.5 5.5h4" />
        <path d="M14.5 7.5h3" />
      </g>
      <g transform="rotate(-8 8 17)">
        <rect x="5" y="14" width="6" height="6" rx="0.5" />
        <path d="M6.5 16.5h3" />
      </g>
      <g transform="rotate(18 17 17.5)">
        <rect x="15" y="15" width="4" height="5" rx="0.5" />
        <path d="M16 17.5h2" />
      </g>
    </svg>
  );
}
