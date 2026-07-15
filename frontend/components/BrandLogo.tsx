import { siteConfig } from "@/lib/site";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className = "", priority = false }: BrandLogoProps) {
  return (
    <span
      aria-label={siteConfig.name}
      className={`relative block aspect-[2.63/1] overflow-hidden ${className}`}
      role="img"
    >
      <img
        alt=""
        aria-hidden="true"
        className="pointer-events-none h-full w-full select-none object-contain"
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        src={siteConfig.logoPath}
      />
    </span>
  );
}
