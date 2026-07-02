type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className = "", priority = false }: BrandLogoProps) {
  return (
    <span
      aria-label="Little Treasures From China"
      className={`relative block aspect-[2.15/1] overflow-hidden ${className}`}
      role="img"
    >
      <img
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-[-30%] top-[-64%] h-auto w-[161%] max-w-none select-none"
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        src="/brand/little-treasures-from-china-logo.png"
      />
    </span>
  );
}
