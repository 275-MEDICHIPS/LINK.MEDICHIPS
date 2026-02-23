"use client";

import Image from "next/image";
import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/course/progress-ring";
import { cn } from "@/lib/utils";

type RiskLevel = "L1" | "L2" | "L3";

interface CourseCardProps {
  title: string;
  thumbnailUrl?: string | null;
  progress: number;
  moduleCount: number;
  riskLevel: RiskLevel;
  description?: string;
  onClick?: () => void;
  className?: string;
}

const riskConfig: Record<
  RiskLevel,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  L1: { label: "Low Risk", variant: "secondary" },
  L2: { label: "Medium Risk", variant: "default" },
  L3: { label: "High Risk", variant: "destructive" },
};

export function CourseCard({
  title,
  thumbnailUrl,
  progress,
  moduleCount,
  riskLevel,
  description,
  onClick,
  className,
}: CourseCardProps) {
  const risk = riskConfig[riskLevel];

  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden transition-shadow hover:shadow-md",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={`${title} thumbnail`}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-50">
            <BookOpen className="h-10 w-10 text-brand-300" />
          </div>
        )}
        {/* Progress ring overlay */}
        <div className="absolute bottom-2 right-2">
          <div className="rounded-full bg-white/90 p-1 shadow-sm backdrop-blur-sm">
            <ProgressRing percentage={progress} size={44} strokeWidth={3} />
          </div>
        </div>
      </div>

      <CardContent className="space-y-2 p-4">
        {/* Risk badge + module count */}
        <div className="flex items-center justify-between">
          <Badge variant={risk.variant}>{risk.label}</Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            {moduleCount} {moduleCount === 1 ? "module" : "modules"}
          </span>
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight group-hover:text-brand-600">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
