import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const supabase = await createClient();

    // Check if user is logged in
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (session) {
        await supabase.auth.signOut();
    }

    // Even if no session found, we return success to ensure client side cleanup proceeds
    // You might want to explicitly expire cookies here if Supabase signOut doesn't do it fully,
    // but supabase.auth.signOut() usually handles it with the configured cookie store.

    return NextResponse.json({ success: true }, {
        status: 200,
    });
}
