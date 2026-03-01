"use client";

import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastTitle,
  ToastDescription,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-[100] flex max-h-screen w-full max-w-[420px] flex-col-reverse gap-2 p-4 sm:flex-col"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <Toast
          key={t.id}
          variant={t.variant}
          onDismiss={() => dismiss(t.id)}
        >
          {t.title && <ToastTitle>{t.title}</ToastTitle>}
          {t.description && (
            <ToastDescription>{t.description}</ToastDescription>
          )}
          {t.action}
        </Toast>
      ))}
    </div>
  );
}
