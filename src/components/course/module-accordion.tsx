"use client";

import { CheckCircle2, Circle, PlayCircle, FileText, HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type LessonStatus = "completed" | "in-progress" | "locked";
type ContentType = "VIDEO" | "TEXT" | "QUIZ" | "MISSION";

interface LessonItem {
  id: string;
  title: string;
  status: LessonStatus;
  contentType: ContentType;
  durationMin?: number;
}

interface ModuleData {
  id: string;
  title: string;
  description?: string;
  lessons: LessonItem[];
}

interface ModuleAccordionProps {
  modules: ModuleData[];
  onLessonClick?: (moduleId: string, lessonId: string) => void;
  className?: string;
}

const contentTypeIcon: Record<ContentType, React.ComponentType<{ className?: string }>> = {
  VIDEO: PlayCircle,
  TEXT: FileText,
  QUIZ: HelpCircle,
  MISSION: CheckCircle2,
};

function StatusIcon({ status }: { status: LessonStatus }) {
  switch (status) {
    case "completed":
      return (
        <CheckCircle2
          className="h-4 w-4 shrink-0 text-accent-500"
          aria-label="Completed"
        />
      );
    case "in-progress":
      return (
        <PlayCircle
          className="h-4 w-4 shrink-0 text-brand-500"
          aria-label="In progress"
        />
      );
    case "locked":
      return (
        <Circle
          className="h-4 w-4 shrink-0 text-muted-foreground/40"
          aria-label="Not started"
        />
      );
  }
}

export function ModuleAccordion({
  modules,
  onLessonClick,
  className,
}: ModuleAccordionProps) {
  return (
    <Accordion
      type="multiple"
      className={cn("w-full", className)}
    >
      {modules.map((mod, idx) => {
        const completedCount = mod.lessons.filter(
          (l) => l.status === "completed"
        ).length;
        const totalCount = mod.lessons.length;

        return (
          <AccordionItem key={mod.id} value={mod.id}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-1 items-center gap-3 text-left">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{mod.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {completedCount}/{totalCount} lessons complete
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {mod.description && (
                <p className="mb-3 text-xs text-muted-foreground">
                  {mod.description}
                </p>
              )}
              <ul className="space-y-1" role="list">
                {mod.lessons.map((lesson) => {
                  const TypeIcon = contentTypeIcon[lesson.contentType];
                  const isClickable =
                    lesson.status !== "locked" && !!onLessonClick;

                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        disabled={!isClickable}
                        onClick={() => onLessonClick?.(mod.id, lesson.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          isClickable
                            ? "hover:bg-muted cursor-pointer"
                            : "cursor-default opacity-60"
                        )}
                        aria-label={`${lesson.title} - ${lesson.status}`}
                      >
                        <StatusIcon status={lesson.status} />
                        <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">
                          {lesson.title}
                        </span>
                        {lesson.durationMin && (
                          <span className="text-xs text-muted-foreground">
                            {lesson.durationMin}min
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
