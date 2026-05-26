import * as React from "react";
import { cn } from "../../lib/utils";

type AlertVariant = "default" | "destructive" | "success";

const variantClasses: Record<AlertVariant, string> = {
  default: "border-border text-foreground",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }
>(({ className, variant = "default", ...props }, ref) => (
  <div ref={ref} role="alert" className={cn("relative w-full rounded-lg border p-4 text-sm", variantClasses[variant], className)} {...props} />
));
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-normal", className)} {...props} />
);
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("text-sm leading-6", className)} {...props} />
);
AlertDescription.displayName = "AlertDescription";
