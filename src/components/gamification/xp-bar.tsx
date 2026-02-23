"use client";

import { cn } from "@/lib/utils";

interface XpBarProps {
  currentXp: number;
  xpForNextLevel: number;
  level: number;
  className?: string;
}

export function XpBar({
  currentXp,
  xpForNextLevel,
  level,
  className,
}: XpBarProps) {
  const percentage = Math.min(100, (currentXp / xpForNextLevel) * 100);

  return (
    <div
      className={cn("flex items-center gap-3", className)}
      role="progressbar"
      aria-valuenow={currentXp}
      aria-valuemin={0}
      aria-valuemax={xpForNextLevel}
      aria-label={`Level ${level}: ${currentXp} of ${xpForNextLevel} XP`}
    >
      {/* Level badge */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
        {level}
      </div>

      {/* Progress bar */}
      <div className="flex-1 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="font-medium text-foreground">Level {level}</span>
          <span className="text-muted-foreground">
            {currentXp.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
