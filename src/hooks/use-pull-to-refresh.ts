"use client";

import { useCallback, useRef, useState } from "react";

const PULL_THRESHOLD = 50;

interface PullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export function usePullToRefresh(
  onRefresh: () => Promise<void>
): PullToRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isRefreshing) return;
      // Only activate when scrolled to top
      const scrollTop =
        document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    },
    [isRefreshing]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || isRefreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        // Apply resistance: diminishing returns after threshold
        setPullDistance(Math.min(delta * 0.5, 100));
      }
    },
    [isRefreshing]
  );

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current || isRefreshing) return;
    pulling.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD); // Lock at threshold during refresh
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  return {
    isRefreshing,
    pullDistance,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
