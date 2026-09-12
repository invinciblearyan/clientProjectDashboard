export interface PaginationInput {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function getPagination(input: PaginationInput): { skip: number; take: number } {
  const page = Math.max(1, input.page);
  const limit = Math.max(1, Math.min(100, input.limit));
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function buildPaginationMeta(
  input: PaginationInput,
  total: number,
): PaginationMeta {
  const limit = Math.max(1, Math.min(100, input.limit));
  const page = Math.max(1, input.page);
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 0,
  };
}
