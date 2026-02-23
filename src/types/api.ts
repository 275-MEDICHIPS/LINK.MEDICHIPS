export interface ApiResponse<T> {
  data: T | null;
  error: ApiErrorDetail | null;
}

export interface ApiErrorDetail {
  message: string;
  code?: string;
  details?: { path: string; message: string }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  error: null;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
