import { z } from 'zod';

/**
 * Strong password validation schema
 * Requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

/**
 * User role enum
 */
export const userRoleSchema = z.enum(['patient', 'nutritionist']);

/**
 * Signup request body validation schema
 */
export const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .trim(),
  role: userRoleSchema,
});

export type SignupData = z.infer<typeof signupSchema>;
