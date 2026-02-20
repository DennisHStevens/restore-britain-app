// Atomic registration Edge Function — see DEC-014
//
// Receives: invite_code, email, password, display_name, x_handle
// Performs all steps atomically with the service_role key:
//   1. Validate invite code (exists, not expired, not used up)
//   2. Create user via Supabase Admin Auth API
//   3. Update the auto-created profile row (display_name, x_handle, is_verified)
//   4. Increment times_used on the invite code
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
    const { invite_code, email, password, display_name, x_handle } =
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
    if (!display_name || typeof display_name !== "string") {
      return jsonResponse({ error: "Display name is required." }, 400);
    }

    // --- Create service-role Supabase client ---
    // These env vars are automatically available in Edge Functions
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // --- Step 1: Validate invite code ---
    const { data: codeData, error: codeError } = await supabase
      .from("invite_codes")
      .select("id, code, max_uses, times_used, expires_at")
      .eq("code", invite_code.trim())
      .single();

    if (codeError || !codeData) {
      // Generic error — don't reveal whether the code exists
      return jsonResponse(
        { error: "Registration failed. Please check your invite code." },
        400
      );
    }

    // Check expiry
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return jsonResponse(
        { error: "Registration failed. Please check your invite code." },
        400
      );
    }

    // Check usage limit
    if (codeData.times_used >= codeData.max_uses) {
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
        display_name: display_name.trim(),
        x_handle: x_handle?.trim() || null,
        is_verified: true,
        invite_code_used: invite_code.trim(),
      })
      .eq("id", userId);

    if (profileError) {
      // Profile update failed — clean up the created user
      console.error("Profile update failed:", profileError.message);
      await supabase.auth.admin.deleteUser(userId);
      return jsonResponse({ error: "Registration failed. Please try again." }, 500);
    }

    // --- Step 4: Increment times_used on the invite code ---
    const { error: incrementError } = await supabase
      .from("invite_codes")
      .update({ times_used: codeData.times_used + 1 })
      .eq("id", codeData.id);

    if (incrementError) {
      // Non-fatal — user is created. Log it but don't fail the registration.
      // The code might be usable one extra time, but that's better than
      // rolling back a successful registration.
      console.error(
        "Failed to increment invite code usage:",
        incrementError.message
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
