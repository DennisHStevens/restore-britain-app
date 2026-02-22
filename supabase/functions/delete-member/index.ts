// Delete Member Edge Function
//
// Receives: user_id (the member to delete)
// Authenticated via: caller's JWT (must be super_admin)
//
// Steps:
//   1. Verify the caller is a super_admin
//   2. Verify the target user exists and is not a super_admin
//   3. Delete votes by this member (FK → profiles via user_id)
//   4. Nullify reply_to_id refs to member's comments (self-ref FK)
//   5. Delete comments by this member (FK → profiles via author_id)
//   6. Delete posts by this member + their dependents (comments, votes)
//   7. Nullify invite_codes.created_by
//   8. Delete invite_codes used by this member (code is consumed)
//   9. Delete the profile row
//  10. Delete the auth user via Admin API
//
// Foreign key constraints on posts, comments, and votes reference
// profiles(id) with default RESTRICT behaviour — we must delete
// dependent rows before removing the profile.
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

    // --- Step 1: Delete votes by this member ---
    // votes.user_id references profiles(id) with RESTRICT
    const { error: votesError } = await adminClient
      .from("votes")
      .delete()
      .eq("user_id", user_id);

    if (votesError) {
      console.error("Failed to delete votes:", votesError.message);
      // Non-fatal if table doesn't exist yet — continue
    }

    // --- Step 2: Gather the member's comment IDs for FK cleanup ---
    const { data: userComments } = await adminClient
      .from("comments")
      .select("id")
      .eq("author_id", user_id);

    const userCommentIds = userComments?.map((c: { id: string }) => c.id) || [];

    // --- Step 3: Nullify reply_to_id references pointing at member's comments ---
    // comments.reply_to_id is a self-referential FK to comments(id).
    // Other users' replies that reference the member's comments would
    // block deletion if we don't break the link first.
    if (userCommentIds.length > 0) {
      const { error: replyRefError } = await adminClient
        .from("comments")
        .update({ reply_to_id: null })
        .in("reply_to_id", userCommentIds);

      if (replyRefError) {
        console.error("Failed to nullify reply_to_id refs:", replyRefError.message);
      }
    }

    // --- Step 4: Delete the member's comments ---
    // comments.author_id references profiles(id) with RESTRICT
    if (userCommentIds.length > 0) {
      const { error: commentsError } = await adminClient
        .from("comments")
        .delete()
        .eq("author_id", user_id);

      if (commentsError) {
        console.error("Failed to delete comments:", commentsError.message);
      }
    }

    // --- Step 5: Delete the member's posts and their dependents ---
    // posts.author_id references profiles(id) with RESTRICT.
    // Before deleting a post, we must remove all comments and votes on it.
    const { data: userPosts } = await adminClient
      .from("posts")
      .select("id")
      .eq("author_id", user_id);

    if (userPosts && userPosts.length > 0) {
      const postIds = userPosts.map((p: { id: string }) => p.id);

      // 5a. Nullify reply_to_id within these posts' comments (self-ref FK)
      for (const postId of postIds) {
        await adminClient
          .from("comments")
          .update({ reply_to_id: null })
          .eq("post_id", postId)
          .not("reply_to_id", "is", null);
      }

      // 5b. Delete all comments on these posts (other users' comments)
      const { error: orphanCommentsError } = await adminClient
        .from("comments")
        .delete()
        .in("post_id", postIds);

      if (orphanCommentsError) {
        console.error("Failed to delete orphan comments:", orphanCommentsError.message);
      }

      // 5c. Delete votes on these posts (target_id is not a real FK,
      // but cleaning up avoids orphaned vote records)
      for (const postId of postIds) {
        await adminClient
          .from("votes")
          .delete()
          .eq("target_type", "post")
          .eq("target_id", postId);
      }

      // 5d. Delete the posts themselves
      const { error: postsError } = await adminClient
        .from("posts")
        .delete()
        .eq("author_id", user_id);

      if (postsError) {
        console.error("Failed to delete posts:", postsError.message);
      }
    }

    // --- Step 6: Nullify invite_codes.created_by ---
    // This column is nullable, so we can set it to null safely
    const { error: createdByError } = await adminClient
      .from("invite_codes")
      .update({ created_by: null })
      .eq("created_by", user_id);

    if (createdByError) {
      console.error("Failed to nullify created_by:", createdByError.message);
    }

    // --- Step 7: Delete invite codes used by this member ---
    // The code was consumed when the member registered — now that the
    // member is deleted, the code should disappear too (not reappear
    // as available).
    const { error: deleteCodeError } = await adminClient
      .from("invite_codes")
      .delete()
      .eq("used_by", user_id);

    if (deleteCodeError) {
      console.error("Failed to delete used invite codes:", deleteCodeError.message);
    }

    // --- Step 8: Delete the profile row ---
    const { error: profileDeleteError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", user_id);

    if (profileDeleteError) {
      console.error("Failed to delete profile:", profileDeleteError.message);
      return jsonResponse({ error: "Failed to delete member profile." }, 500);
    }

    // --- Step 9: Delete the auth user ---
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
