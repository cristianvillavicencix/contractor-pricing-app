type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 690 388"
      role="img"
      aria-label="Bidwise"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="690" height="388" rx="0" fill="#000000" />
      <g transform="translate(148 126)">
        <g fill="none" stroke="#3aa65a" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 37h107" strokeWidth="6" />
          <path d="M12 52h122" strokeWidth="7" />
          <path d="M9 68h121" strokeWidth="7" />
          <path d="M14 84h109" strokeWidth="6" />
          <path d="M16 99h83" strokeWidth="5" />
          <path d="M59 7v100" strokeWidth="7" />
          <path d="M22 51 59 28l49 25" strokeWidth="7" />
          <path d="M106 24v74" strokeWidth="6" />
          <path d="M27 57v48" strokeWidth="5" />
          <path d="M78 44v63" strokeWidth="5" />
          <path d="M115 17v89" stroke="#ffffff" strokeWidth="5" />
          <path d="M125 23v72" stroke="#ffffff" strokeWidth="4" />
          <path d="M134 30v58" stroke="#ffffff" strokeWidth="4" />
          <path d="M3 43h-18" strokeWidth="3" />
          <path d="M3 60h-30" strokeWidth="3" />
          <path d="M2 77h-22" strokeWidth="3" />
          <path d="M4 94h-12" strokeWidth="3" />
          <path d="M20 106v12" strokeWidth="6" />
          <path d="M20 118c-7-7-7-15 0-22c7 7 7 15 0 22z" fill="#3aa65a" strokeWidth="2" />
        </g>
        <text
          x="126"
          y="92"
          fill="#ffffff"
          fontFamily="Inter, Arial, Helvetica, sans-serif"
          fontSize="72"
          fontWeight="900"
        >
          Bid
        </text>
        <text
          x="247"
          y="92"
          fill="#3aa65a"
          fontFamily="Inter, Arial, Helvetica, sans-serif"
          fontSize="72"
          fontWeight="900"
        >
          wise
        </text>
        <circle cx="281" cy="25" r="7" fill="#3aa65a" stroke="#ffffff" strokeWidth="1" />
      </g>
    </svg>
  );
}
