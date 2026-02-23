"use client";

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakCounterProps {
  days: number;
  isActive?: boolean;
  className?: string;
}

export function StreakCounter({
  days,
  isActive = true,
  className,
}: StreakCounterProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
        isActive
          ? "bg-healthcare-amber/10 text-healthcare-amber"
          : "bg-muted text-muted-foreground",
        className
      )}
      role="status"
      aria-label={`${days} day streak${isActive ? ", active" : ", inactive"}`}
    >
      <Flame
        className={cn(
          "h-5 w-5",
          isActive && "animate-pulse drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]"
        )}
      />
      <span className="text-sm font-bold tabular-nums">{days}</span>
      <span className="text-xs font-medium">
        {days === 1 ? "day" : "days"}
      </span>
    </div>
  );
}
