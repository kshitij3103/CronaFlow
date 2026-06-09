export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hexagon Outline */}
      <path d="M50 5 L90 28 L90 72 L50 95 L10 72 L10 28 Z" stroke="var(--primary-color)" strokeWidth="8" strokeLinejoin="round" />
      {/* Inner Clock Face */}
      <circle cx="50" cy="50" r="20" fill="var(--primary-color)" />
      {/* Clock Hands */}
      <path d="M50 50 L50 35" stroke="var(--bg-color)" strokeWidth="6" strokeLinecap="round" />
      <path d="M50 50 L62 58" stroke="var(--bg-color)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
