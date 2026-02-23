"use client";

import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** Progress percentage from 0 to 100 */
  percentage: number;
  /** Diameter of the ring in pixels */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Whether to show the percentage text in the center */
  showLabel?: boolean;
  className?: string;
}

export function ProgressRing({
  percentage,
  size = 64,
  strokeWidth = 4,
  showLabel = true,
  className,
}: ProgressRingProps) {
  const clampedPct = Math.max(0, Math.min(100, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedPct / 100) * circumference;

  const getColor = () => {
    if (clampedPct >= 100) return "text-accent-500";
    if (clampedPct >= 50) return "text-brand-500";
    if (clampedPct >= 25) return "text-healthcare-amber";
    return "text-muted-foreground";
  };

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="progressbar"
      aria-valuenow={clampedPct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${clampedPct}% complete`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/50"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-500 ease-out", getColor())}
        />
      </svg>
      {showLabel && (
        <span
          className="absolute text-xs font-semibold"
          aria-hidden="true"
          style={{ fontSize: size * 0.22 }}
        >
          {Math.round(clampedPct)}%
        </span>
      )}
    </div>
  );
}
