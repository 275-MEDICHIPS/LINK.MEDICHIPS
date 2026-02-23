"use client";

import { useEffect, useRef, useCallback } from "react";
import { Award, PartyPopper, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CelebrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  badgeIcon?: React.ReactNode;
  xpEarned?: number;
}

/**
 * Single confetti particle rendered as a positioned span.
 */
function ConfettiParticle({ index }: { index: number }) {
  const colors = [
    "bg-brand-400",
    "bg-brand-500",
    "bg-accent-400",
    "bg-healthcare-amber",
    "bg-healthcare-purple",
    "bg-healthcare-red",
  ];
  const color = colors[index % colors.length];

  // Deterministic but varied positioning based on index
  const left = ((index * 37 + 13) % 100);
  const delay = ((index * 0.23) % 2).toFixed(2);
  const duration = (1.5 + (index * 0.17) % 1.5).toFixed(2);
  const size = index % 3 === 0 ? "h-2 w-2" : index % 3 === 1 ? "h-1.5 w-3" : "h-3 w-1";

  return (
    <span
      className={cn(
        "absolute top-0 rounded-full opacity-0",
        color,
        size
      )}
      style={{
        left: `${left}%`,
        animation: `confetti-fall ${duration}s ease-out ${delay}s forwards`,
      }}
      aria-hidden="true"
    />
  );
}

export function CelebrationModal({
  open,
  onOpenChange,
  title,
  description,
  badgeIcon,
  xpEarned,
}: CelebrationModalProps) {
  const styleRef = useRef<HTMLStyleElement | null>(null);

  const injectStyles = useCallback(() => {
    if (typeof document === "undefined") return;
    if (styleRef.current) return;

    const style = document.createElement("style");
    style.textContent = `
      @keyframes confetti-fall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(300px) rotate(720deg); opacity: 0; }
      }
      @keyframes celebration-bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
    `;
    document.head.appendChild(style);
    styleRef.current = style;
  }, []);

  useEffect(() => {
    if (open) {
      injectStyles();
    }
    return () => {
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    };
  }, [open, injectStyles]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-md">
        {/* Confetti layer */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          {open &&
            Array.from({ length: 24 }).map((_, i) => (
              <ConfettiParticle key={i} index={i} />
            ))}
        </div>

        <DialogHeader className="items-center text-center">
          {/* Animated badge icon */}
          <div
            className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100"
            style={{
              animation: open
                ? "celebration-bounce 0.6s ease-in-out 0.3s 2"
                : undefined,
            }}
          >
            {badgeIcon ?? (
              <Award className="h-10 w-10 text-brand-600" />
            )}
          </div>

          <div className="flex items-center justify-center gap-1">
            <Star className="h-4 w-4 text-healthcare-amber" />
            <DialogTitle className="text-xl">{title}</DialogTitle>
            <Star className="h-4 w-4 text-healthcare-amber" />
          </div>

          {description && (
            <DialogDescription className="text-center">
              {description}
            </DialogDescription>
          )}

          {xpEarned != null && xpEarned > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1 text-sm font-semibold text-accent-700">
              <PartyPopper className="h-4 w-4" />
              +{xpEarned} XP earned
            </div>
          )}
        </DialogHeader>

        <DialogFooter className="sm:justify-center">
          <Button onClick={() => onOpenChange(false)} className="min-w-[120px]">
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
