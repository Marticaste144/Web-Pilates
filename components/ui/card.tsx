import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
  ...rest
}: { children: ReactNode; padded?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-neutral-200 bg-white shadow-sm ${padded ? "p-4 sm:p-5" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
