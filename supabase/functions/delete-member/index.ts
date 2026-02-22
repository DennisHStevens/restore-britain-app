// Delete Member Edge Function
//
// Receives: user_id (the member to delete)
// Authenticated via: caller's JWT (must be super_admin)
//
// Steps:
//   1. Verify the caller is a super_admin
//   2. Verify the target user exists and is not a super_admin
//   3. Reset any invite codes used by this member (free them up)
//   4. Delete the profile row
//   5. Delete the auth user via Admin API
//
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
    const { user_id } = await req.json();

    // --- Input validation ---
    if (!user_id || typeof user_id !== "string") {
      return jsonResponse({ error: "user_id is required." }, 400);
    }

    // --- Create service-role Supabase client for privileged operations ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // --- Verify the caller is a super_admin ---
    // Extract the caller's JWT from the Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorised." }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey);
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !caller) {
      return jsonResponse({ error: "Unauthorised." }, 401);
    }

    // Check caller's role in profiles table
    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfileError || !callerProfile || callerProfile.role !== "super_admin") {
      return jsonResponse({ error: "Only super admins can delete members." }, 403);
    }

    // --- Prevent self-deletion ---
    if (user_id === caller.id) {
      return jsonResponse({ error: "You cannot delete your own account." }, 400);
    }

    // --- Verify target exists and is not a super_admin ---
    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("id, role, username")
      .eq("id", user_id)
      .single();

    if (targetError || !targetProfile) {
      return jsonResponse({ error: "Member not found." }, 404);
    }

    if (targetProfile.role === "super_admin") {
      return jsonResponse({ error: "Cannot delete a super admin." }, 403);
    }

    // --- Step 1: Reset any invite codes used by this member ---
    // This frees the code back up for reuse
    const { error: resetCodeError } = await adminClient
      .from("invite_codes")
      .update({ used_by: null, used_at: null })
      .eq("used_by", user_id);

    if (resetCodeError) {
      // Non-fatal — log but continue with deletion
      console.error("Failed to reset invite codes:", resetCodeError.message);
    }

    // --- Step 2: Delete the profile row ---
    const { error: profileDeleteError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", user_id);

    if (profileDeleteError) {
      console.error("Failed to delete profile:", profileDeleteError.message);
      return jsonResponse({ error: "Failed to delete member profile." }, 500);
    }

    // --- Step 3: Delete the auth user ---
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user_id);

    if (authDeleteError) {
      console.error("Failed to delete auth user:", authDeleteError.message);
      // Profile is already deleted — this is a partial failure
      return jsonResponse(
        { error: "Profile deleted but auth user cleanup failed. Contact support." },
        500
      );
    }

    // --- Success ---
    return jsonResponse(
      { success: true, deleted_user: targetProfile.username },
      200
    );
  } catch (err) {
    console.error("Unexpected error in delete-member function:", err);
    return jsonResponse({ error: "Failed to delete member. Please try again." }, 500);
  }
});

/** Helper: return JSON with CORS headers */
function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
