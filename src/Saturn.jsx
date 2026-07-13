// ─────────────────────────────────────────────────────────────
//  Saturno roxo — a identidade da Lyra.
//  O anel ENVOLVE o planeta: a metade de trás passa atrás,
//  a metade da frente passa por cima. Isso dá o 3D real.
// ─────────────────────────────────────────────────────────────

import { useId } from "react";

export default function Saturn({ size = 200, glow = 1, float = true, className = "" }) {
  const uid = useId().replace(/:/g, "");
  const box = size * 1.9;

  return (
    <div
      className={`saturn ${float ? "sat-float" : ""} ${className}`}
      style={{ width: box, height: box }}
      aria-hidden
    >
      <svg viewBox="0 0 200 200" width={box} height={box} style={{ overflow: "visible", display: "block" }}>
        <defs>
          <radialGradient id={`${uid}b`} cx="35%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="12%" stopColor="#f5ebff" />
            <stop offset="32%" stopColor="#ddb8fe" />
            <stop offset="55%" stopColor="#b06ff8" />
            <stop offset="78%" stopColor="#8b3ff0" />
            <stop offset="100%" stopColor="#3b1178" />
          </radialGradient>

          <linearGradient id={`${uid}r`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6d28d9" stopOpacity="0" />
            <stop offset="12%" stopColor="#9d5cf5" stopOpacity=".6" />
            <stop offset="30%" stopColor="#dda8fb" stopOpacity=".92" />
            <stop offset="50%" stopColor="#f3d4ff" stopOpacity="1" />
            <stop offset="70%" stopColor="#dda8fb" stopOpacity=".92" />
            <stop offset="88%" stopColor="#9d5cf5" stopOpacity=".6" />
            <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={`${uid}r2`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
            <stop offset="25%" stopColor="#d8b4fe" stopOpacity=".75" />
            <stop offset="50%" stopColor="#f0abfc" stopOpacity=".9" />
            <stop offset="75%" stopColor="#d8b4fe" stopOpacity=".75" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity=".22" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <filter id={`${uid}g`} x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation={6 * glow} />
          </filter>
          <filter id={`${uid}s`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>

          {/* metade de TRÁS = acima da linha do centro */}
          <clipPath id={`${uid}back`}>
            <rect x="-60" y="-60" width="320" height="160" />
          </clipPath>
          {/* metade da FRENTE = abaixo da linha do centro */}
          <clipPath id={`${uid}front`}>
            <rect x="-60" y="100" width="320" height="160" />
          </clipPath>
        </defs>

        {/* halo */}
        <circle cx="100" cy="100" r="44" fill="#a855f7" opacity={.3 * glow} filter={`url(#${uid}g)`} />

        {/* ANEL — metade de trás */}
        <g transform="rotate(-17 100 100)" clipPath={`url(#${uid}back)`}>
          <ellipse cx="100" cy="100" rx="94" ry="24" fill="none" stroke={`url(#${uid}r)`} strokeWidth="6" opacity=".45" />
          <ellipse cx="100" cy="100" rx="76" ry="19" fill="none" stroke={`url(#${uid}r2)`} strokeWidth="2.5" opacity=".35" />
        </g>

        {/* PLANETA */}
        <circle cx="100" cy="100" r="42" fill={`url(#${uid}b)`} />
        <ellipse cx="100" cy="87" rx="39" ry="6" fill={`url(#${uid}f)`} opacity=".6" />
        <ellipse cx="100" cy="102" rx="41" ry="5" fill={`url(#${uid}f)`} opacity=".35" />
        <ellipse cx="100" cy="115" rx="34" ry="4" fill={`url(#${uid}f)`} opacity=".22" />
        <ellipse cx="84" cy="82" rx="13" ry="8" fill="#fff" opacity=".9" transform="rotate(-25 84 82)" filter={`url(#${uid}s)`} />
        <path d="M100 142a42 42 0 0 0 40-58 42 42 0 0 1-40 58z" fill="#2e0d63" opacity=".35" filter={`url(#${uid}s)`} />

        {/* ANEL — metade da frente (por cima do planeta) */}
        <g transform="rotate(-17 100 100)" clipPath={`url(#${uid}front)`}>
          <ellipse cx="100" cy="100" rx="94" ry="24" fill="none" stroke="#2e0d63" strokeWidth="9" opacity=".28" />
          <ellipse cx="100" cy="100" rx="94" ry="24" fill="none" stroke={`url(#${uid}r)`} strokeWidth="6" />
          <ellipse cx="100" cy="100" rx="76" ry="19" fill="none" stroke={`url(#${uid}r2)`} strokeWidth="2.5" opacity=".7" />
          <ellipse cx="100" cy="100" rx="106" ry="27" fill="none" stroke={`url(#${uid}r2)`} strokeWidth="1" opacity=".25" />
        </g>
      </svg>
    </div>
  );
}
