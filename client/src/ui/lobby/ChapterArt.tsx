/**
 * Little illustrated scenes for the chapter cards (inline SVG, no image files):
 * the Overgrowth (tall grass, the smoking plane), Misty Gorge (bamboo in the
 * mist) and the Sunken Temple (a temple standing in water).
 */
export function ChapterArt({ n }: { n: number }) {
  if (n === 1)
    return (
      <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="ca1-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5fb4ff" />
            <stop offset="1" stopColor="#c8ecff" />
          </linearGradient>
        </defs>
        <rect width="160" height="100" fill="url(#ca1-sky)" />
        <circle cx="128" cy="22" r="10" fill="#fff3b0" />
        {/* the plane trailing smoke */}
        <path d="M30 30 q12 -6 26 -4" stroke="#8a8a8a" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.7" />
        <rect x="56" y="22" width="22" height="7" rx="3" fill="#f6efe0" stroke="#5a3a12" strokeWidth="1" />
        <rect x="62" y="18" width="4" height="15" rx="1" fill="#e8742a" />
        <path d="M2 70 Q40 52 80 64 T160 58 V100 H0 Z" fill="#2f7a32" />
        <path d="M0 78 Q50 64 100 76 T160 72 V100 H0 Z" fill="#4f9f35" />
        {Array.from({ length: 22 }, (_, i) => (
          <path key={i} d={`M${i * 7.6} 100 l3 -${18 + (i % 4) * 5} l3 ${18 + (i % 4) * 5} Z`} fill={i % 2 ? "#9be22d" : "#6cc81e"} />
        ))}
      </svg>
    );
  if (n === 2)
    return (
      <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden>
        <rect width="160" height="100" fill="#9fd0c4" />
        <path d="M0 40 L30 20 L50 46 L0 90 Z" fill="#5f7a74" />
        <path d="M160 34 L128 16 L104 50 L160 92 Z" fill="#5f7a74" />
        {[20, 46, 70, 96, 118, 140].map((x, i) => (
          <g key={x}>
            <rect x={x} y={14 + (i % 3) * 8} width="6" height="90" fill="#7fb83c" />
            {[30, 50, 70].map((y) => (
              <rect key={y} x={x - 1} y={y + (i % 3) * 4} width="8" height="2" fill="#5f8a2a" />
            ))}
          </g>
        ))}
        <rect width="160" height="100" fill="#e8f6f2" opacity="0.35" />
      </svg>
    );
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden>
      <rect width="160" height="100" fill="#7fc8b4" />
      <path d="M50 64 h60 v-10 h-8 v-10 h-8 v-10 h-28 v10 h-8 v10 h-8 Z" fill="#7d7f74" />
      <rect x="74" y="44" width="12" height="20" fill="#2a2a24" />
      <rect y="62" width="160" height="38" fill="#2f7f9a" />
      <path d="M0 70 q20 -4 40 0 t40 0 t40 0 t40 0" stroke="#bfefff" strokeWidth="2" fill="none" opacity="0.7" />
    </svg>
  );
}
