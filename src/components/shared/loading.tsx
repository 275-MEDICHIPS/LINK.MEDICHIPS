"use client";

import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-3",
} as const;

interface LoadingProps {
  size?: keyof typeof sizeMap;
  className?: string;
  label?: string;
}

export function Loading({ size = "md", className, label }: LoadingProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-2", className)}
      role="status"
      aria-label={label ?? "Loading"}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-solid border-primary border-t-transparent",
          sizeMap[size]
        )}
      />
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}
