/**
 * Environment Variables Validation
 * 
 * Validates all required environment variables at startup.
 * This ensures the app fails fast with clear error messages
 * if any required configuration is missing.
 */

import { z } from 'zod';

/**
 * Schema for server-side environment variables
 * These are NOT exposed to the client
 */
const serverEnvSchema = z.object({
    // Supabase Service Role Key (never exposed to client)
    SUPABASE_SERVICE_ROLE_KEY: z
        .string()
        .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

    // Node environment
    NODE_ENV: z
        .enum(['development', 'production', 'test'])
        .default('development'),
});

/**
 * Schema for public environment variables
 * These are prefixed with NEXT_PUBLIC_ and exposed to the client
 */
const publicEnvSchema = z.object({
    // Supabase URL
    NEXT_PUBLIC_SUPABASE_URL: z
        .string()
        .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),

    // Supabase Anon Key
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z
        .string()
        .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
});

/**
 * Combined schema for all environment variables
 */
const envSchema = serverEnvSchema.merge(publicEnvSchema);

export type Env = z.infer<typeof envSchema>;

/**
 * Validated environment variables
 * Access these instead of process.env directly
 */
function validateEnv(): Env {
    // Only validate on server side
    if (typeof window !== 'undefined') {
        // On client, we can only access public vars
        // Return a partial object with public vars
        return {
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            // Server vars will be empty/undefined on client (this is fine)
            SUPABASE_SERVICE_ROLE_KEY: '',
            NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
        };
    }

    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error(
            '❌ Invalid environment variables:',
            parsed.error.flatten().fieldErrors
        );

        // Format errors for clear output
        const errors = Object.entries(parsed.error.flatten().fieldErrors)
            .map(([key, messages]) => `  - ${key}: ${messages?.join(', ')}`)
            .join('\n');

        throw new Error(
            `Missing or invalid environment variables:\n${errors}\n\n` +
            'Please check your .env.local file and ensure all required variables are set.'
        );
    }

    return parsed.data;
}

// Export validated env
export const env = validateEnv();

/**
 * Helper to check if we're in development mode
 */
export const isDevelopment = () => env.NODE_ENV === 'development';

/**
 * Helper to check if we're in production mode
 */
export const isProduction = () => env.NODE_ENV === 'production';

/**
 * Helper to check if we're in test mode
 */
export const isTest = () => env.NODE_ENV === 'test';
