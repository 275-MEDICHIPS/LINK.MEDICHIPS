"use client";

import { Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BadgeDisplayProps {
  name: string;
  description: string;
  icon?: React.ReactNode;
  earnedAt?: string | Date | null;
  className?: string;
}

export function BadgeDisplay({
  name,
  description,
  icon,
  earnedAt,
  className,
}: BadgeDisplayProps) {
  const isEarned = !!earnedAt;
  const formattedDate = earnedAt
    ? new Date(earnedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Card
      className={cn(
        "transition-all",
        isEarned
          ? "border-brand-200 bg-brand-50/50"
          : "border-border opacity-50 grayscale",
        className
      )}
    >
      <CardContent className="flex items-start gap-3 p-4">
        {/* Badge icon */}
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            isEarned
              ? "bg-brand-100 text-brand-600"
              : "bg-muted text-muted-foreground"
          )}
        >
          {icon ?? <Award className="h-6 w-6" />}
        </div>

        {/* Badge info */}
        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="text-sm font-semibold leading-tight">{name}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
          {formattedDate && (
            <p className="text-xs text-brand-600">
              Earned on {formattedDate}
            </p>
          )}
          {!isEarned && (
            <p className="text-xs italic text-muted-foreground">
              Not yet earned
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
