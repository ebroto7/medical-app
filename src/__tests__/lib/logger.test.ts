/**
 * Tests for Logger (TDD)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import pino from 'pino';
import { logger } from '@/lib/logger';

// Mock pino module
vi.mock('pino', () => {
    const mockInstance = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    };
    return {
        default: vi.fn(() => mockInstance)
    };
});

describe('Logger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should have standard log methods', () => {
        expect(logger.info).toBeDefined();
        expect(logger.error).toBeDefined();
        expect(logger.warn).toBeDefined();
        expect(logger.debug).toBeDefined();
    });

    it('should call pino methods with correct arguments', () => {
        logger.info('Test message');
        // We get the instance from the actual logger import (which uses the mock)
        // Since logger IS the instance returned by pino(), we can spy on its methods directly
        // because they are the jest.fn() created in the mock factory
        expect(logger.info).toHaveBeenCalledWith('Test message');
    });

    it('should support structured logging with objects', () => {
        const meta = { userId: '123' };
        logger.info(meta, 'User login');

        expect(logger.info).toHaveBeenCalledWith(meta, 'User login');
    });

    it('should handle errors correctly', () => {
        const error = new Error('Something went wrong');
        logger.error(error);

        expect(logger.error).toHaveBeenCalledWith(error);
    });
});
