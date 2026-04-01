import type { ReactNode } from "react";

const MAX_W = {
  sm: "max-w-3xl",   // docs/prose — keep readable line-length
  md: "w-full",      // standard pages — full available width
  lg: "w-full",      // wide pages — full available width
} as const;

interface PageShellProps {
  title: string;
  subtitle?: string;
  /** Buttons / controls placed to the right of the title */
  actions?: ReactNode;
  children: ReactNode;
  /** sm = 3xl · md = full (default) · lg = full */
  size?: keyof typeof MAX_W;
}

/**
 * Consistent page wrapper: full-width by default, standardises the header layout
 * and vertical spacing so every page looks uniform without duplicating heading markup.
 */
export default function PageShell({
  title,
  subtitle,
  actions,
  children,
  size = "md",
}: PageShellProps) {
  return (
    <div className={`${MAX_W[size]} flex flex-col gap-6`}>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-zinc-500 mt-1 leading-snug">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>
        )}
      </div>

      {children}
    </div>
  );
}
