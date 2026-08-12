import type { ReactNode } from "react";

type Variant = "success" | "error" | "warning" | "info";

const VARIANT: Record<Variant, { box: string; icon: string }> = {
  success: { box: "bg-success-50 text-success-700", icon: "text-success-600" },
  error: { box: "bg-error-50 text-error-700", icon: "text-error-600" },
  warning: { box: "bg-warning-50 text-warning-700", icon: "text-warning-600" },
  info: { box: "bg-info-50 text-info-700", icon: "text-info-600" },
};

function Icon({ variant, className }: { variant: Variant; className?: string }) {
  const common = { className, viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": true } as const;
  if (variant === "success") {
    return (
      <svg {...common}>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg {...common}>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.7 7.3a1 1 0 00-1.4 1.4L8.6 10l-1.3 1.3a1 1 0 101.4 1.4L10 11.4l1.3 1.3a1 1 0 001.4-1.4L11.4 10l1.3-1.3a1 1 0 00-1.4-1.4L10 8.6 8.7 7.3z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (variant === "warning") {
    return (
      <svg {...common}>
        <path d="M8.3 3.6a2 2 0 013.4 0l6.4 10.8A2 2 0 0116.4 17.5H3.6a2 2 0 01-1.7-3.1L8.3 3.6zM10 7a1 1 0 00-1 1v3a1 1 0 002 0V8a1 1 0 00-1-1zm0 7.5a1 1 0 100-2 1 1 0 000 2z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm.9-11.9a1 1 0 11-1.8 0 1 1 0 011.8 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h.5a1 1 0 000-2H10V10a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function Alert({
  variant,
  children,
  className = "",
}: {
  variant: Variant;
  children: ReactNode;
  className?: string;
}) {
  const styles = VARIANT[variant];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl p-3.5 text-sm ${styles.box} ${className}`}>
      <Icon variant={variant} className={`mt-0.5 h-4 w-4 shrink-0 ${styles.icon}`} />
      <div className="min-w-0 leading-snug">{children}</div>
    </div>
  );
}
