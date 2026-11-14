/** Decorative shapes inspired by the shape-tile board (petal X, sparkle, starburst, flowers). */
type P = { className?: string; color?: string };

export function PetalX({ className, color = "currentColor" }: P) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <g fill={color}>
        <ellipse cx="50" cy="50" rx="13" ry="44" transform="rotate(45 50 50)" />
        <ellipse cx="50" cy="50" rx="13" ry="44" transform="rotate(-45 50 50)" />
      </g>
    </svg>
  );
}

export function Sparkle({ className, color = "currentColor" }: P) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path fill={color} d="M50 0 C54 38 62 46 100 50 C62 54 54 62 50 100 C46 62 38 54 0 50 C38 46 46 38 50 0Z" />
    </svg>
  );
}

export function Starburst({ className, color = "currentColor", points = 14 }: P & { points?: number }) {
  const d: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? 48 : 22;
    const a = (Math.PI * i) / points - Math.PI / 2;
    d.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <polygon fill={color} points={d.join(" ")} />
    </svg>
  );
}

export function Flower({ className, color = "currentColor", petals = 6 }: P & { petals?: number }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <g fill={color}>
        {Array.from({ length: petals }, (_, i) => (
          <ellipse key={i} cx="50" cy="27" rx="15" ry="23" transform={`rotate(${(360 / petals) * i} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="16" />
      </g>
    </svg>
  );
}

export function Scallop({ className, color = "currentColor" }: P) {
  // wavy-edged badge (like the red 14-point scallop tile)
  const pts: string[] = [];
  const n = 14;
  for (let i = 0; i <= 360; i += 3) {
    const a = (i * Math.PI) / 180;
    const r = 42 + 6 * Math.cos(n * a);
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <polygon fill={color} points={pts.join(" ")} />
    </svg>
  );
}

export function Rays({ className, color = "currentColor" }: P) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <g stroke={color} strokeWidth="1.4" strokeLinecap="round">
        {Array.from({ length: 24 }, (_, i) => {
          const a = (Math.PI * 2 * i) / 24;
          return <line key={i} x1="50" y1="50" x2={50 + 46 * Math.cos(a)} y2={50 + 46 * Math.sin(a)} />;
        })}
      </g>
      <circle cx="50" cy="50" r="6" fill={color} />
    </svg>
  );
}
