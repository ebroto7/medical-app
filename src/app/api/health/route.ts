import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

export async function GET() {
  try {
    // Test de conexión a Supabase
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Intentar consultar una tabla simple para verificar conexión
    const { data, error } = await supabase
      .from("profiles")
      .select("count", { count: "exact" })
      .limit(1);

    if (error) {
      return Response.json(
        {
          status: "error",
          message: "Supabase connection failed",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        status: "ok",
        message: "Supabase connection successful",
        timestamp: new Date().toISOString(),
        environment: {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
            ? "✓ Configured"
            : "✗ Missing",
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            ? "✓ Configured"
            : "✗ Missing",
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      {
        status: "error",
        message: "Health check failed",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
