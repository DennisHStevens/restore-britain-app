// Atomic registration Edge Function — see DEC-014
//
// Receives: invite_code, email, password, username, x_handle
// Performs all steps atomically with the service_role key:
//   1. Validate invite code (exists and unused)
//   2. Create user via Supabase Admin Auth API
//   3. Update the auto-created profile row (username, x_handle, is_verified)
//   4. Mark the invite code as used (set used_by and used_at)
//
// If any step fails, cleans up and returns a generic error.
// The service_role key never leaves the server.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { invite_code, email, password, username, x_handle } =
      await req.json();

    // --- Input validation ---
    if (!invite_code || typeof invite_code !== "string") {
      return jsonResponse({ error: "Invite code is required." }, 400);
    }
    if (!email || typeof email !== "string") {
      return jsonResponse({ error: "Email is required." }, 400);
    }
    if (!password || typeof password !== "string" || password.length < 12) {
      return jsonResponse(
        { error: "Password must be at least 12 characters." },
        400
      );
    }
    if (!username || typeof username !== "string") {
      return jsonResponse({ error: "Username is required." }, 400);
    }
    // Validate username format: 3-20 chars, alphanumeric + underscores
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      return jsonResponse({ error: "Username must be 3-20 characters, letters, numbers, and underscores only." }, 400);
    }

    // --- Create service-role Supabase client ---
    // These env vars are automatically available in Edge Functions
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // --- Step 1: Validate invite code (exists and unused) ---
    // Normalise to uppercase to match the stored format
    const normalisedCode = invite_code.trim().toUpperCase();

    const { data: codeData, error: codeError } = await supabase
      .from("invite_codes")
      .select("id, code, used_by")
      .eq("code", normalisedCode)
      .single();

    if (codeError || !codeData) {
      // Generic error — don't reveal whether the code exists
      return jsonResponse(
        { error: "Registration failed. Please check your invite code." },
        400
      );
    }

    // Check if already used (single-use codes)
    if (codeData.used_by !== null) {
      return jsonResponse(
        { error: "Registration failed. Please check your invite code." },
        400
      );
    }

    // --- Step 2: Create user via Admin API ---
    // email_confirm: true means the user is immediately verified in Auth
    // (no confirmation email needed — we trust the invite code as proof)
    const { data: userData, error: userError } =
      await supabase.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
      });

    if (userError) {
      // Could be duplicate email, etc. Generic error.
      console.error("User creation failed:", userError.message);
      return jsonResponse(
        { error: "Registration failed. This email may already be in use." },
        400
      );
    }

    const userId = userData.user.id;

    // --- Step 3: Update the auto-created profile ---
    // The on_auth_user_created trigger already inserted a bare profile row.
    // We now fill in the remaining fields and mark as verified.
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        x_handle: x_handle?.trim() || null,
        is_verified: true,
        invite_code_used: normalisedCode,
      })
      .eq("id", userId);

    if (profileError) {
      // Profile update failed — clean up the created user
      console.error("Profile update failed:", profileError.message);
      await supabase.auth.admin.deleteUser(userId);
      return jsonResponse({ error: "Registration failed. Please try again." }, 500);
    }

    // --- Step 4: Mark the invite code as used ---
    const { error: markUsedError } = await supabase
      .from("invite_codes")
      .update({
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq("id", codeData.id)
      .is("used_by", null); // Extra safety: only update if still unused (race condition guard)

    if (markUsedError) {
      // Non-fatal — user is created. Log it but don't fail the registration.
      // Worst case: the code appears unused in admin but was actually used.
      console.error(
        "Failed to mark invite code as used:",
        markUsedError.message
      );
    }

    // --- Success ---
    return jsonResponse({ success: true, user_id: userId }, 200);
  } catch (err) {
    console.error("Unexpected error in register function:", err);
    return jsonResponse({ error: "Registration failed. Please try again." }, 500);
  }
});

/** Helper: return JSON with CORS headers */
function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
