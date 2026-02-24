import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/guards";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
) {
  return NextResponse.json({
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    error: null,
  });
}

export function handleError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { data: null, error: { message: error.message } },
      { status: error.statusCode }
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      { data: null, error: { message: error.message, code: error.code } },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
      },
      { status: 400 }
    );
  }

  console.error("Unhandled error:", error);
  return NextResponse.json(
    { data: null, error: { message: "Internal server error" } },
    { status: 500 }
  );
}
