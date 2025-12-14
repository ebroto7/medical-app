/**
 * Pagination Helper
 * Reusable pagination utilities for API endpoints
 */

// Pagination defaults
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationMeta;
}

/**
 * Parse pagination parameters from URL search params
 * Enforces min/max constraints
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    // Parse page (default to 1)
    let page = pageParam ? parseInt(pageParam, 10) : DEFAULT_PAGE;
    if (isNaN(page) || page < 1) {
        page = DEFAULT_PAGE;
    }

    // Parse limit (default to 20, min 1, max 100)
    let limit = limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT;
    if (isNaN(limit)) {
        limit = DEFAULT_LIMIT;
    } else if (limit < 1) {
        limit = 1;
    } else if (limit > MAX_LIMIT) {
        limit = MAX_LIMIT;
    }

    return { page, limit };
}

/**
 * Create pagination metadata for response
 */
export function createPaginationMeta({
    page,
    limit,
    total,
}: {
    page: number;
    limit: number;
    total: number;
}): PaginationMeta {
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
    };
}

/**
 * Calculate Supabase range for pagination
 * Returns { from, to } for use with .range(from, to)
 */
export function paginateQuery({
    page,
    limit,
}: PaginationParams): { from: number; to: number } {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    return { from, to };
}

/**
 * Helper to apply pagination to a Supabase query and get count
 * Usage:
 * ```
 * const { data, count, error } = await supabase
 *   .from('table')
 *   .select('*', { count: 'exact' })
 *   .range(from, to);
 * ```
 */
export function getPaginationRange(
    searchParams: URLSearchParams
): { params: PaginationParams; from: number; to: number } {
    const params = parsePaginationParams(searchParams);
    const { from, to } = paginateQuery(params);

    return { params, from, to };
}

/**
 * Create a paginated response object
 */
export function createPaginatedResponse<T>(
    data: T[],
    params: PaginationParams,
    total: number
): PaginatedResponse<T> {
    return {
        data,
        pagination: createPaginationMeta({
            page: params.page,
            limit: params.limit,
            total,
        }),
    };
}
