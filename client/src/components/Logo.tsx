export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Eight Months 학습 대시보드"
    >
      {/* 8개의 호 — 8개월 진척 */}
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.6" opacity="0.18" />
      <path
        d="M16 3 A 13 13 0 0 1 29 16"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M29 16 A 13 13 0 0 1 16 29"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      {/* 중앙의 화살표 — 성장 */}
      <path
        d="M11 20 L16 11 L21 20 M13 17 L19 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
