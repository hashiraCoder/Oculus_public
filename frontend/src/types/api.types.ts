export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

export interface CursorParams {
  cursor?: string;
  limit?: number;
}
