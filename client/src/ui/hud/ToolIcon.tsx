import type { ReactNode } from "react";
import type { ToolKey } from "../../game/economy/economy";

const INK = "#1b1b1b";

/** Gradient fill along the tool (dark base -> bright tip). */
function Grad({ id, a, b }: { id: string; a: string; b: string }) {
  return (
    <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  );
}

/** Thick outlined stroke (a handle or shaft drawn as a line). */
function Rod({ d, color, w = 5 }: { d: string; color: string; w?: number }) {
  return (
    <>
      <path d={d} stroke={INK} strokeWidth={w + 3} strokeLinecap="round" fill="none" />
      <path d={d} stroke={color} strokeWidth={w} strokeLinecap="round" fill="none" />
    </>
  );
}

/** Each tool drawn with its own silhouette (64x64), tool pointing up-right. */
const ICONS: Record<ToolKey, (id: string) => ReactNode> = {
  sickle: (id) => (
    <>
      <defs><Grad id={id} a="#6e665d" b="#c4baa9" /></defs>
      <Rod d="M14 58 L26 42" color="#6b4423" w={6} />
      {[47, 51].map((y) => <path key={y} d={`M${18 + (51 - y) * 0.7} ${y + 2} l5 -2`} stroke="#cdb98e" strokeWidth="2" />)}
      <path d="M25 43 C 18 30, 22 12, 38 8 C 52 5, 60 16, 54 28 C 52 20, 46 14, 38 15 C 28 17, 26 30, 30 40 Z" fill={`url(#${id})`} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M53 26 C 50 19, 45 15, 38 16 C 30 18, 27 28, 30 38" fill="none" stroke="#ddd4c4" strokeWidth="1.5" />
      <circle cx="31" cy="20" r="2" fill="#a65a26" /><circle cx="44" cy="10" r="1.5" fill="#a65a26" />
    </>
  ),
  machete: (id) => (
    <>
      <defs><Grad id={id} a="#7d8994" b="#eef4f8" /></defs>
      <g transform="rotate(45 32 32)" strokeLinejoin="round">
        <path d="M28 36 L28 8 Q28 2 33 1 Q38 4 38 12 Q39 26 36 36 Z" fill={`url(#${id})`} stroke={INK} strokeWidth="1.6" />
        <path d="M36.2 34 Q38.6 24 37.6 12 Q37.4 6 33.5 2.5" fill="none" stroke="#ffffff" strokeWidth="1.6" />
        <rect x="24.5" y="35" width="15" height="4" rx="2" fill="#d63a2f" stroke={INK} strokeWidth="1.4" />
        <rect x="28.5" y="39" width="7" height="17" rx="2.5" fill="#1d1d1f" stroke={INK} strokeWidth="1.4" />
        {[42, 46, 50].map((y) => <path key={y} d={`M28.8 ${y + 2} L35.2 ${y}`} stroke="#3a3a40" strokeWidth="1.8" />)}
        <rect x="27.5" y="55" width="9" height="4" rx="2" fill="#d63a2f" stroke={INK} strokeWidth="1.4" />
      </g>
    </>
  ),
  shears: (id) => (
    <>
      <defs><Grad id={id} a="#8a96a1" b="#eef4f8" /></defs>
      <Rod d="M30 36 L14 58" color="#3f8f4f" w={6} />
      <Rod d="M33 38 L24 60" color="#5fbf6a" w={6} />
      <path d="M31 35 L47 6 Q51 4 51 9 L36 37 Z" fill={`url(#${id})`} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M31 35 L55 14 Q59 13 58 17 L36 38 Z" fill={`url(#${id})`} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="33" cy="36" r="3.4" fill="#e0b04a" stroke={INK} strokeWidth="1.4" />
    </>
  ),
  scythe: (id) => (
    <>
      <defs><Grad id={id} a="#4f8a74" b="#e8fff4" /></defs>
      <Rod d="M12 60 L44 8" color="#7a5230" w={4} />
      <Rod d="M24 41 L31 44" color="#2f6a42" w={4} />
      <path d="M44 7 C 32 2, 14 4, 3 18 C 16 11, 30 10, 45 14 Z" fill={`url(#${id})`} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5 16 C 17 10, 30 10, 44 13" fill="none" stroke="#e8fff4" strokeWidth="1.5" />
    </>
  ),
  axe: (id) => (
    <>
      <defs><Grad id={id} a="#b07a18" b="#ffe27a" /></defs>
      <Rod d="M18 58 L42 14" color="#3a2a20" w={5} />
      {[50, 46].map((y, i) => <Rod key={y} d={`M${22 + i * 2} ${y} l0.1 -0.1`} color="#d63a2f" w={6} />)}
      <path d="M36 10 L46 16 L42 24 L32 18 Z" fill="#c8901e" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M36 12 L22 2 Q12 12 16 28 L32 20 Z" fill={`url(#${id})`} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M22 2 Q12 12 16 28" fill="none" stroke="#fff6c8" strokeWidth="1.6" />
      <path d="M45 17 L53 17 L47 23 Z" fill="#b07a18" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
    </>
  ),
  glaive: (id) => (
    <>
      <defs><Grad id={id} a="#3a8ab8" b="#e8fbff" /></defs>
      <Rod d="M10 60 L38 24" color="#e8eef4" w={4} />
      {[[16, 52], [24, 42], [32, 32]].map(([x, y]) => <Rod key={x} d={`M${x - 1} ${y + 1} L${x + 1} ${y - 1}`} color="#7a5cd6" w={5} />)}
      <path d="M37 26 C 40 16, 48 8, 61 3 C 57 12, 52 20, 42 30 Z" fill={`url(#${id})`} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M41 28 C 50 20, 56 12, 60 5" fill="none" stroke="#ffffff" strokeWidth="1.4" />
      <path d="M38 24 L33 18 L40 21 Z" fill="#7fd4f0" stroke={INK} strokeWidth="1.2" />
      <circle cx="37.5" cy="25.5" r="2.6" fill="#a88cff" stroke={INK} strokeWidth="1.2" />
    </>
  ),
  grassCutter: (id) => (
    <>
      <defs><Grad id={id} a="#9aa2aa" b="#f2f6f8" /></defs>
      <Rod d="M50 54 L18 16" color="#b8c0c8" w={4} />
      <Rod d="M36 32 L43 26" color="#1d1d1f" w={4} />
      <rect x="44" y="47" width="16" height="13" rx="3" fill="#ff6a1a" stroke={INK} strokeWidth="1.5" transform="rotate(-40 52 53)" />
      <path d="M4 13 A 13 13 0 0 1 28 9" fill="#ff8a3a" stroke={INK} strokeWidth="1.4" />
      <circle cx="16" cy="15" r="10" fill={`url(#${id})`} stroke={INK} strokeWidth="1.6" />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return <circle key={i} cx={16 + Math.cos(a) * 10.5} cy={15 + Math.sin(a) * 10.5} r="1.3" fill="#ffffff" stroke={INK} strokeWidth="0.6" />;
      })}
      <circle cx="16" cy="15" r="3" fill="#2a2a2a" />
      <path d="M8 26 q-3 3 -6 3 M12 29 q-2 3 -5 4" stroke="#ffffff" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  ),
};

/** Hand-drawn SVG icon of a tool for the hotbar / shop. */
export function ToolIcon({ tool, size = 56 }: { tool: ToolKey; size?: number }) {
  const draw = ICONS[tool] ?? ICONS.machete;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      {draw(`tool-${tool}`)}
    </svg>
  );
}
