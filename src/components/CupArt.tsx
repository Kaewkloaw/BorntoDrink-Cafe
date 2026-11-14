import type { Product } from "@/lib/products";

/** Hand-drawn style product illustration (no stock photos needed). */
export function CupArt({ product, className }: { product: Product; className?: string }) {
  const [top, bottom] = product.colors;
  const id = product.id;
  const stroke = "#3b1d0f";

  if (product.style === "pastry") {
    return (
      <svg viewBox="0 0 120 120" className={className} aria-hidden>
        <ellipse cx="60" cy="96" rx="46" ry="9" fill="#00000014" />
        <ellipse cx="60" cy="90" rx="48" ry="10" fill="#fff" stroke={stroke} strokeWidth="3" />
        {id === "bk-croissant" && (
          <path d="M18 80 Q30 42 60 40 Q90 42 102 80 Q86 72 78 82 Q70 66 60 82 Q50 66 42 82 Q34 72 18 80Z" fill={top} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
        )}
        {id === "bk-muffin" && (
          <>
            <path d="M36 84 L42 58 H78 L84 84Z" fill="#f3e3cc" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
            <path d="M32 60 Q34 30 60 30 Q86 30 88 60Z" fill={top} stroke={stroke} strokeWidth="3" />
            {[[48, 44], [62, 38], [72, 50], [54, 54]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill={bottom} />)}
          </>
        )}
        {id === "bk-cake" && (
          <>
            <path d="M24 84 V56 L96 44 V84Z" fill={top} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
            <path d="M24 68 L96 60" stroke="#f4a3b4" strokeWidth="6" />
            <path d="M24 56 Q60 40 96 44" fill="#fff" stroke={stroke} strokeWidth="3" />
            <path d="M66 34 q8 -10 14 2 q-2 10 -7 12 q-6 -4 -7 -14Z" fill={bottom} stroke={stroke} strokeWidth="2.5" />
          </>
        )}
        {id === "bk-pancake" && (
          <>
            {[78, 66, 54].map((y) => <ellipse key={y} cx="60" cy={y} rx="34" ry="9" fill={top} stroke={stroke} strokeWidth="3" />)}
            <rect x="52" y="38" width="16" height="10" rx="2" fill="#fde68a" stroke={stroke} strokeWidth="2.5" />
            <path d="M34 56 q-2 14 4 18 M84 56 q3 10 -1 16" stroke={bottom} strokeWidth="5" strokeLinecap="round" fill="none" />
          </>
        )}
      </svg>
    );
  }

  if (product.style === "hot") {
    return (
      <svg viewBox="0 0 120 120" className={className} aria-hidden>
        <ellipse cx="60" cy="102" rx="44" ry="8" fill="#00000014" />
        <ellipse cx="58" cy="96" rx="44" ry="9" fill="#fff" stroke={stroke} strokeWidth="3" />
        <path d="M88 52 q20 0 18 16 q-2 14 -22 14" fill="none" stroke={stroke} strokeWidth="6" />
        <path d="M88 52 q20 0 18 16 q-2 14 -22 14" fill="none" stroke="#fff" strokeWidth="2.5" />
        <path d="M22 44 H94 L88 84 Q86 94 74 94 H42 Q30 94 28 84Z" fill="#fff" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
        <ellipse cx="58" cy="46" rx="34" ry="7" fill={bottom} stroke={stroke} strokeWidth="2.5" />
        <path d="M50 46 q8 -6 16 0 q-8 5 -16 0Z" fill={top} />
        <path d="M46 30 q-6 -8 0 -16 M60 28 q-6 -8 0 -16 M74 30 q-6 -8 0 -16" stroke="#c9a68a" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    );
  }

  // iced / frappe — tall clear cup with layered drink
  const gradId = `g-${id}`;
  return (
    <svg viewBox="0 0 120 140" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={top} />
          <stop offset="45%" stopColor={top} />
          <stop offset="70%" stopColor={bottom} />
        </linearGradient>
        <clipPath id={`c-${id}`}>
          <path d="M28 36 H92 L84 128 H36Z" />
        </clipPath>
      </defs>
      <ellipse cx="60" cy="132" rx="30" ry="5" fill="#00000014" />
      {product.style === "frappe" || product.cream ? (
        <path d="M30 38 Q28 18 46 18 Q50 6 62 10 Q74 4 78 18 Q94 18 90 38Z" fill="#fffaf2" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
      ) : null}
      {product.style === "frappe" && <rect x="66" y="0" width="6" height="40" rx="3" fill="#d54c15" stroke={stroke} strokeWidth="2" transform="rotate(12 69 20)" />}
      <g clipPath={`url(#c-${id})`}>
        <rect x="20" y="40" width="80" height="100" fill={`url(#${gradId})`} />
        {product.style === "iced" &&
          [[44, 60], [66, 70], [50, 88], [70, 98]].map(([x, y], i) => (
            <rect key={i} x={x - 8} y={y - 8} width="16" height="16" rx="3" fill="#ffffff55" stroke="#ffffff99" strokeWidth="1.5" transform={`rotate(${i * 17} ${x} ${y})`} />
          ))}
      </g>
      <path d="M28 36 H92 L84 128 H36Z" fill="none" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 46 L40 118" stroke="#ffffff99" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
