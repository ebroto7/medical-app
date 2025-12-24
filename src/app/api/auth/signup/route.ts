import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import rateLimit from '@/lib/rate-limit';
import { signupSchema } from '@/lib/validation/auth';
import { ZodError } from 'zod';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/signup
 *
 * Secure backend endpoint for user registration.
 * Uses service_role_key to bypass RLS and create both auth user and profile atomically.
 * Rate limited to 5 requests per minute per IP.
 *
 * Request body:
 * {
 *   email: string,
 *   password: string,
 *   fullName: string,
 *   role: "user" | "doc"
 * }
 *
 * Response (201 Created):
 * {
 *   success: true,
 *   message: string,
 *   user: { id, email, role }
 * }
 *
 * Errors:
 * 400: Missing or invalid fields
 * 422: User already exists or other Supabase auth error
 * 429: Too many requests (rate limited)
 * 500: Database error
 */

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // ============================================
    // RATE LIMITING
    // ============================================
    const rateLimitResult = rateLimit(req, 'auth');
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // ============================================
    // VALIDATION
    // ============================================
    const body = await req.json();
    const validatedData = signupSchema.parse(body);
    const { email, password, fullName, role } = validatedData;

    // ============================================
    // STEP 1: Create Auth User
    // ============================================

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser(
      {
        email,
        password,
        user_metadata: {
          full_name: fullName,
        },
        email_confirm: false,
      }
    );

    if (authError || !authData.user) {
      // Provide specific error messages for common cases
      let errorMessage = 'Failed to create account';

      if (authError?.message?.includes('already')) {
        errorMessage = 'This email is already registered';
      } else if (authError?.message?.includes('password')) {
        errorMessage = 'Password does not meet security requirements';
      }

      logger.error({ error: authError }, 'Auth user creation failed');

      return Response.json(
        {
          error: errorMessage,
        },
        { status: 422 }
      );
    }

    // ============================================
    // STEP 2: Create Profile Record
    // ============================================

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: fullName.trim(),
        role: role,
      });

    if (profileError) {
      // If profile creation fails, delete the orphaned auth user
      logger.error(
        { error: profileError, userId: authData.user.id },
        'Profile creation failed'
      );

      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return Response.json(
        {
          error: 'Failed to create user profile',
        },
        { status: 500 }
      );
    }

    // ============================================
    // SUCCESS
    // ============================================

    return Response.json(
      {
        success: true,
        message: 'Account created successfully. Please log in to continue.',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role: role,
          fullName: fullName,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return Response.json(
        {
          error: 'Validation failed',
          details: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    // Log and handle other errors
    logger.error({ error }, 'Signup endpoint error');

    return Response.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
