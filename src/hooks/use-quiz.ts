"use client";

import { useCallback, useState, useRef } from "react";
import type {
  QuizQuestion,
  QuizAnswer,
  AnswerValue,
  QuizResult,
} from "@/types/quiz";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuizPhase = "IDLE" | "LOADING" | "IN_PROGRESS" | "SUBMITTING" | "COMPLETED";

interface UseQuizReturn {
  /** Current phase of the quiz */
  phase: QuizPhase;
  /** All questions for the active quiz */
  questions: QuizQuestion[];
  /** Index of the current question (0-based) */
  currentIndex: number;
  /** Map of questionId to submitted answer */
  answers: Record<string, AnswerValue>;
  /** Error message if any */
  error: string | null;
  /** Quiz result after submission */
  result: QuizResult | null;
  /** Final score as percentage (null until completed) */
  score: number | null;
  /** Whether the learner passed */
  isPassing: boolean | null;
  /** Elapsed time in seconds */
  elapsedSec: number;

  // Actions
  startQuiz: (quizId: string) => Promise<void>;
  submitAnswer: (questionId: string, answer: AnswerValue) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  submitQuiz: () => Promise<QuizResult>;
  resetQuiz: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useQuiz(): UseQuizReturn {
  const [phase, setPhase] = useState<QuizPhase>("IDLE");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const quizIdRef = useRef<string | null>(null);
  const attemptIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Timer management
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start a quiz attempt
  const startQuiz = useCallback(
    async (quizId: string) => {
      setPhase("LOADING");
      setError(null);
      setAnswers({});
      setCurrentIndex(0);
      setResult(null);

      try {
        const res = await fetch(`/api/v1/quizzes/${quizId}/attempt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start" }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message ?? "Failed to start quiz");
        }

        const json = await res.json();
        const data = json.data as {
          attemptId: string;
          questions: QuizQuestion[];
        };

        quizIdRef.current = quizId;
        attemptIdRef.current = data.attemptId;
        setQuestions(data.questions);
        setPhase("IN_PROGRESS");
        startTimer();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start quiz");
        setPhase("IDLE");
      }
    },
    [startTimer]
  );

  // Record an answer for a question
  const submitAnswer = useCallback(
    (questionId: string, answer: AnswerValue) => {
      setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    },
    []
  );

  // Navigation
  const goToQuestion = useCallback(
    (index: number) => {
      if (index >= 0 && index < questions.length) {
        setCurrentIndex(index);
      }
    },
    [questions.length]
  );

  const nextQuestion = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1));
  }, [questions.length]);

  const prevQuestion = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Submit all answers
  const submitQuiz = useCallback(async (): Promise<QuizResult> => {
    if (!quizIdRef.current || !attemptIdRef.current) {
      throw new Error("No active quiz attempt");
    }

    setPhase("SUBMITTING");
    setError(null);
    stopTimer();

    try {
      // Build answer payload
      const quizAnswers: Omit<QuizAnswer, "correct" | "pointsEarned">[] =
        questions.map((q) => ({
          questionId: q.id,
          answer: answers[q.id] ?? { type: "MULTIPLE_CHOICE", selectedId: "" },
          answeredAt: new Date().toISOString(),
        }));

      const res = await fetch(
        `/api/v1/quizzes/${quizIdRef.current}/attempt`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: attemptIdRef.current,
            answers: quizAnswers,
            timeSpentSec: elapsedSec,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to submit quiz");
      }

      const json = await res.json();
      const quizResult = json.data as QuizResult;

      setResult(quizResult);
      setPhase("COMPLETED");
      return quizResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setPhase("IN_PROGRESS");
      startTimer();
      throw err;
    }
  }, [questions, answers, elapsedSec, stopTimer, startTimer]);

  // Reset everything
  const resetQuiz = useCallback(() => {
    stopTimer();
    quizIdRef.current = null;
    attemptIdRef.current = null;
    setPhase("IDLE");
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setError(null);
    setResult(null);
    setElapsedSec(0);
  }, [stopTimer]);

  // Derived values
  const score = result ? result.percentage : null;
  const isPassing = result ? result.passed : null;

  return {
    phase,
    questions,
    currentIndex,
    answers,
    error,
    result,
    score,
    isPassing,
    elapsedSec,
    startQuiz,
    submitAnswer,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    submitQuiz,
    resetQuiz,
  };
}
