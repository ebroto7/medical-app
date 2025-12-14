/**
 * Structured Logger using Pino
 * 
 * Provides consistent logging across the application.
 * In development, uses pino-pretty for readable output.
 * In production, outputs structured JSON for log aggregation.
 */

import pino from 'pino';

// Constants for log levels
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const IS_DEV = process.env.NODE_ENV === 'development';

export const logger = pino({
    level: LOG_LEVEL,
    transport: IS_DEV
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                ignore: 'pid,hostname',
                translateTime: 'SYS:standard',
            },
        }
        : undefined,
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    base: IS_DEV ? undefined : { pid: process.pid, hostname: process.env.HOSTNAME },
});

// Helper to sanitize sensitive data (passwords, tokens, etc.)
export const sanitize = (obj: any, keys: string[] = ['password', 'token', 'secret']) => {
    if (!obj) return obj;
    const copy = { ...obj };

    keys.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(copy, key)) {
            copy[key] = '[REDACTED]';
        }
    });

    return copy;
};
