import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import rateLimit from '@/lib/rate-limit';

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

    // Parse request body
    const body = await req.json();
    const { email, password, fullName, role } = body;

    // ============================================
    // VALIDATION
    // ============================================

    // Check required fields
    if (!email || !password || !fullName || !role) {
      return Response.json(
        {
          error: 'Missing required fields: email, password, fullName, role',
        },
        { status: 400 }
      );
    }

    // Email validation - RFC 5322 basic check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json(
        {
          error: 'Invalid email format',
        },
        { status: 400 }
      );
    }

    // Role validation
    const validRoles = ['patient', 'nutritionist'];
    if (!validRoles.includes(role)) {
      return Response.json(
        {
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Password validation - minimum 8 characters
    // Future: enforce 12+ characters for better security
    if (!password || password.length < 8) {
      return Response.json(
        {
          error: 'Password must be at least 8 characters long',
        },
        { status: 400 }
      );
    }

    // Full name validation - not empty
    if (typeof fullName !== 'string' || fullName.trim().length === 0) {
      return Response.json(
        {
          error: 'Full name cannot be empty',
        },
        { status: 400 }
      );
    }

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

      console.error('Auth creation error:', authError);

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
      console.error('Profile creation error:', {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
      });

      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return Response.json(
        {
          error: `Failed to create user profile: ${profileError.message}`,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Signup endpoint error:', errorMessage);

    return Response.json(
      {
        error: `Server error: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
