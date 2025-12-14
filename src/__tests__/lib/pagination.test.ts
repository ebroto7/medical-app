/**
 * Tests for Pagination Helper (TDD - Write tests first)
 * These tests define the expected behavior of the pagination helper
 */

import { describe, it, expect } from 'vitest';
import {
    parsePaginationParams,
    createPaginationMeta,
    paginateQuery,
    DEFAULT_PAGE,
    DEFAULT_LIMIT,
    MAX_LIMIT,
} from '@/lib/pagination';

describe('Pagination Helper', () => {
    describe('parsePaginationParams', () => {
        it('should return defaults when no params provided', () => {
            const searchParams = new URLSearchParams();
            const result = parsePaginationParams(searchParams);

            expect(result.page).toBe(DEFAULT_PAGE);
            expect(result.limit).toBe(DEFAULT_LIMIT);
        });

        it('should parse valid page and limit', () => {
            const searchParams = new URLSearchParams('page=3&limit=50');
            const result = parsePaginationParams(searchParams);

            expect(result.page).toBe(3);
            expect(result.limit).toBe(50);
        });

        it('should enforce minimum page of 1', () => {
            const searchParams = new URLSearchParams('page=0');
            const result = parsePaginationParams(searchParams);

            expect(result.page).toBe(1);
        });

        it('should enforce minimum page of 1 for negative values', () => {
            const searchParams = new URLSearchParams('page=-5');
            const result = parsePaginationParams(searchParams);

            expect(result.page).toBe(1);
        });

        it('should enforce minimum limit of 1', () => {
            const searchParams = new URLSearchParams('limit=0');
            const result = parsePaginationParams(searchParams);

            expect(result.limit).toBe(1);
        });

        it('should enforce maximum limit', () => {
            const searchParams = new URLSearchParams('limit=500');
            const result = parsePaginationParams(searchParams);

            expect(result.limit).toBe(MAX_LIMIT);
        });

        it('should handle non-numeric values gracefully', () => {
            const searchParams = new URLSearchParams('page=abc&limit=xyz');
            const result = parsePaginationParams(searchParams);

            expect(result.page).toBe(DEFAULT_PAGE);
            expect(result.limit).toBe(DEFAULT_LIMIT);
        });

        it('should handle floating point numbers by truncating', () => {
            const searchParams = new URLSearchParams('page=2.7&limit=15.9');
            const result = parsePaginationParams(searchParams);

            expect(result.page).toBe(2);
            expect(result.limit).toBe(15);
        });
    });

    describe('createPaginationMeta', () => {
        it('should calculate correct pagination metadata', () => {
            const result = createPaginationMeta({
                page: 2,
                limit: 20,
                total: 100,
            });

            expect(result).toEqual({
                page: 2,
                limit: 20,
                total: 100,
                totalPages: 5,
                hasNext: true,
                hasPrev: true,
            });
        });

        it('should return hasNext=false on last page', () => {
            const result = createPaginationMeta({
                page: 5,
                limit: 20,
                total: 100,
            });

            expect(result.hasNext).toBe(false);
            expect(result.hasPrev).toBe(true);
        });

        it('should return hasPrev=false on first page', () => {
            const result = createPaginationMeta({
                page: 1,
                limit: 20,
                total: 100,
            });

            expect(result.hasPrev).toBe(false);
            expect(result.hasNext).toBe(true);
        });

        it('should handle zero total items', () => {
            const result = createPaginationMeta({
                page: 1,
                limit: 20,
                total: 0,
            });

            expect(result.totalPages).toBe(0);
            expect(result.hasNext).toBe(false);
            expect(result.hasPrev).toBe(false);
        });

        it('should handle single page of results', () => {
            const result = createPaginationMeta({
                page: 1,
                limit: 20,
                total: 15,
            });

            expect(result.totalPages).toBe(1);
            expect(result.hasNext).toBe(false);
            expect(result.hasPrev).toBe(false);
        });

        it('should handle exact page boundary', () => {
            // 100 items with limit 20 = exactly 5 pages
            const result = createPaginationMeta({
                page: 1,
                limit: 20,
                total: 100,
            });

            expect(result.totalPages).toBe(5);
        });

        it('should round up for partial pages', () => {
            // 101 items with limit 20 = 6 pages (last page has 1 item)
            const result = createPaginationMeta({
                page: 1,
                limit: 20,
                total: 101,
            });

            expect(result.totalPages).toBe(6);
        });
    });

    describe('paginateQuery', () => {
        it('should calculate correct offset for page 1', () => {
            const result = paginateQuery({ page: 1, limit: 20 });

            expect(result.from).toBe(0);
            expect(result.to).toBe(19);
        });

        it('should calculate correct offset for page 2', () => {
            const result = paginateQuery({ page: 2, limit: 20 });

            expect(result.from).toBe(20);
            expect(result.to).toBe(39);
        });

        it('should calculate correct offset for page 5 with limit 10', () => {
            const result = paginateQuery({ page: 5, limit: 10 });

            expect(result.from).toBe(40);
            expect(result.to).toBe(49);
        });

        it('should handle limit of 1', () => {
            const result = paginateQuery({ page: 3, limit: 1 });

            expect(result.from).toBe(2);
            expect(result.to).toBe(2);
        });
    });
});
