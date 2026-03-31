import type { ReactNode } from "react";

const MAX_W = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
} as const;

interface PageShellProps {
  title: string;
  subtitle?: string;
  /** Buttons / controls placed to the right of the title */
  actions?: ReactNode;
  children: ReactNode;
  /** sm = 3xl · md = 5xl (default) · lg = 6xl */
  size?: keyof typeof MAX_W;
}

/**
 * Consistent page wrapper: standardises max-width, header layout, and vertical
 * spacing so every page looks the same without duplicating heading markup.
 */
export default function PageShell({
  title,
  subtitle,
  actions,
  children,
  size = "md",
}: PageShellProps) {
  return (
    <div className={`${MAX_W[size]} space-y-6`}>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">{title}</h1>
          {subtitle && (
            <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {children}
    </div>
  );
}
