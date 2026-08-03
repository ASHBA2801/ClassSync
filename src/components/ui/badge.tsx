import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  type LucideIcon,
} from "lucide-react";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "border border-primary/30 bg-primary/15 text-primary",
        success: "border border-emerald-400/35 bg-success-light text-success",
        warning: "border border-amber-400/35 bg-warning-light text-warning",
        danger: "border border-red-400/35 bg-danger-light text-danger",
        info: "border border-blue-400/35 bg-info-light text-info",
        outline: "glass-panel text-text-2",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const variantIcons: Record<string, LucideIcon> = {
  success: CheckCircle,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: LucideIcon;
  hideIcon?: boolean;
}

function Badge({
  className,
  variant,
  icon,
  hideIcon = false,
  children,
  ...props
}: BadgeProps) {
  const IconComp = icon ?? (variant ? variantIcons[variant] : undefined);

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {!hideIcon && IconComp && <IconComp className="h-3.5 w-3.5" />}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
