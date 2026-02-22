import { supabase } from './supabase';

/**
 * boardsApi.ts — Data access layer for gb/ Boards.
 *
 * All Supabase queries for boards, posts, comments, votes, and
 * image uploads live here. Every query goes through the anon-key
 * client with RLS — no service role key.
 *
 * Cursor-based pagination uses created_at timestamps to avoid
 * offset-based drift when new content is added between pages.
 */

// ─── Types ───────────────────────────────────────────────────

export interface Board {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  scope_type: 'national' | 'region';
  scope_id: string | null;
  is_locked: boolean;
  post_count: number;
  created_at: string;
}

export interface Post {
  id: string;
  board_id: string;
  author_id: string;
  title: string;
  body: string;
  image_urls: string[];
  is_pinned: boolean;
  is_locked: boolean;
  upvote_count: number;
  comment_count: number;
  last_comment_at: string | null;
  created_at: string;
  updated_at: string;
  /** Joined from profiles */
  author: {
    username: string;
    region_id: string | null;
    role: string;
  };
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  image_urls: string[];
  reply_to_id: string | null;
  upvote_count: number;
  created_at: string;
  updated_at: string;
  /** Null if not deleted, timestamp if soft-deleted */
  deleted_at: string | null;
  /** Joined from profiles */
  author: {
    username: string;
    role: string;
  };
  /** If replying to another comment, the name of that comment's author */
  reply_to_author_name?: string;
}

export interface Vote {
  id: string;
  user_id: string;
  target_type: 'post' | 'comment';
  target_id: string;
  value: 1 | -1;
}

export type SortMode = 'hot' | 'new' | 'top';

/** How many posts to load per page */
const PAGE_SIZE = 20;

// ─── Board queries ───────────────────────────────────────────

/**
 * Fetch all boards. For MVP this returns just gb/national,
 * but the query supports any number of boards.
 */
export async function fetchBoards(): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Board[];
}

/**
 * Fetch a single board by its slug (e.g., "national").
 */
export async function fetchBoardBySlug(slug: string): Promise<Board | null> {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as Board;
}

// ─── Post queries ────────────────────────────────────────────

/**
 * Fetch posts for a board with sorting and cursor-based pagination.
 *
 * Pinned posts always come first regardless of sort mode.
 * The cursor is the created_at value of the last post on the
 * previous page — we fetch posts older than this value.
 *
 * Returns { posts, hasMore } so the UI knows whether to show
 * a "Load more" button.
 */
export async function fetchPosts(
  boardId: string,
  sort: SortMode = 'hot',
  cursor?: string
): Promise<{ posts: Post[]; hasMore: boolean }> {
  // Build the base query with author join
  let query = supabase
    .from('posts')
    .select(`
      id, board_id, author_id, title, body, image_urls,
      is_pinned, is_locked, upvote_count, comment_count,
      last_comment_at, created_at, updated_at,
      author:profiles!posts_author_id_fkey(username, region_id, role)
    `)
    .eq('board_id', boardId)
    .is('deleted_at', null);

  // Apply cursor for pagination — always based on created_at
  // to avoid issues with null last_comment_at values
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  // Apply sort order.
  // Pinned posts are handled by sorting is_pinned DESC first,
  // so pinned posts always appear at the top.
  switch (sort) {
    case 'hot':
      // Hot = most recent activity. Pinned first, then by last_comment_at.
      // Posts with no comments yet use created_at implicitly (NULLS LAST).
      query = query
        .order('is_pinned', { ascending: false })
        .order('last_comment_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      break;
    case 'new':
      query = query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      break;
    case 'top':
      query = query
        .order('is_pinned', { ascending: false })
        .order('upvote_count', { ascending: false })
        .order('created_at', { ascending: false });
      break;
  }

  // Fetch one extra to know if there are more pages
  query = query.limit(PAGE_SIZE + 1);

  const { data, error } = await query;
  if (error) throw error;

  const posts = (data ?? []) as Post[];
  const hasMore = posts.length > PAGE_SIZE;

  // Remove the extra item used for hasMore detection
  if (hasMore) posts.pop();

  return { posts, hasMore };
}

/**
 * Fetch a single post by ID with author info.
 */
export async function fetchPost(postId: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id, board_id, author_id, title, body, image_urls,
      is_pinned, is_locked, upvote_count, comment_count,
      last_comment_at, created_at, updated_at,
      author:profiles!posts_author_id_fkey(username, region_id, role)
    `)
    .eq('id', postId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Post;
}

/**
 * Create a new post in a board.
 * Returns the newly created post ID.
 */
export async function createPost(
  boardId: string,
  authorId: string,
  title: string,
  body: string,
  imageUrls: string[] = []
): Promise<string> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      board_id: boardId,
      author_id: authorId,
      title,
      body,
      image_urls: imageUrls,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

// ─── Comment queries ─────────────────────────────────────────

/**
 * Fetch all comments for a post, sorted chronologically.
 * Includes author username and the reply-to author name
 * if the comment is replying to another comment.
 */
export async function fetchComments(postId: string): Promise<Comment[]> {
  // Fetch ALL comments including soft-deleted ones so the threaded tree
  // stays intact. Deleted comments render as "[deleted]" placeholders
  // in the UI — their body and images are cleared server-side on delete.
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id, post_id, author_id, body, image_urls,
      reply_to_id, upvote_count, created_at, updated_at, deleted_at,
      author:profiles!comments_author_id_fkey(username, role)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const comments = (data ?? []) as Comment[];

  // Build a map of comment IDs to author names for reply-to resolution.
  // This avoids N+1 queries — we already have all comments loaded.
  const commentAuthorMap = new Map<string, string>();
  for (const c of comments) {
    commentAuthorMap.set(c.id, c.author?.username ?? 'Unknown');
  }

  // Attach reply_to_author_name where applicable
  for (const c of comments) {
    if (c.reply_to_id && commentAuthorMap.has(c.reply_to_id)) {
      c.reply_to_author_name = commentAuthorMap.get(c.reply_to_id);
    }
  }

  return comments;
}

/**
 * Create a new comment on a post.
 * Returns the newly created comment ID.
 */
export async function createComment(
  postId: string,
  authorId: string,
  body: string,
  imageUrls: string[] = [],
  replyToId?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      author_id: authorId,
      body,
      image_urls: imageUrls,
      reply_to_id: replyToId ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Soft-delete a comment.
 *
 * Sets deleted_at to now() and clears the body and images for privacy.
 * The row remains in the database so the threaded tree structure is
 * preserved — the frontend renders it as a "[deleted]" placeholder.
 *
 * RLS ensures only the comment author can do this (auth.uid() = author_id).
 */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .update({
      deleted_at: new Date().toISOString(),
      body: '[deleted]',
      image_urls: [],
    })
    .eq('id', commentId);

  if (error) throw error;
}

// ─── Vote queries ────────────────────────────────────────────

/**
 * Fetch the current user's votes for a set of target IDs.
 * Used to highlight which posts/comments the user has already voted on.
 */
export async function fetchUserVotes(
  userId: string,
  targetType: 'post' | 'comment',
  targetIds: string[]
): Promise<Map<string, 1 | -1>> {
  if (targetIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('votes')
    .select('target_id, value')
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .in('target_id', targetIds);

  if (error) throw error;

  const voteMap = new Map<string, 1 | -1>();
  for (const v of (data ?? [])) {
    voteMap.set(v.target_id, v.value as 1 | -1);
  }
  return voteMap;
}

/**
 * Cast or change a vote on a post or comment.
 *
 * Logic:
 * - If no existing vote: INSERT
 * - If existing vote with same value: DELETE (toggle off)
 * - If existing vote with different value: UPDATE (flip)
 *
 * Returns the new vote state: { value: 1|-1|null, delta: number }
 * where delta is the change in upvote_count (for optimistic UI rollback).
 */
export async function castVote(
  userId: string,
  targetType: 'post' | 'comment',
  targetId: string,
  newValue: 1 | -1
): Promise<{ value: 1 | -1 | null; delta: number }> {
  // Check for existing vote
  const { data: existing, error: lookupError } = await supabase
    .from('votes')
    .select('id, value')
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (!existing) {
    // No existing vote — insert new one
    const { error } = await supabase.from('votes').insert({
      user_id: userId,
      target_type: targetType,
      target_id: targetId,
      value: newValue,
    });
    if (error) throw error;
    return { value: newValue, delta: newValue };
  }

  if (existing.value === newValue) {
    // Same vote — toggle off (delete)
    const { error } = await supabase
      .from('votes')
      .delete()
      .eq('id', existing.id);
    if (error) throw error;
    // Removing a +1 vote means delta is -1, removing a -1 vote means delta is +1
    return { value: null, delta: -existing.value };
  }

  // Different vote — flip it
  const { error } = await supabase
    .from('votes')
    .update({ value: newValue })
    .eq('id', existing.id);
  if (error) throw error;
  // Flipping from -1 to +1 is a delta of +2, from +1 to -1 is -2
  return { value: newValue, delta: newValue - existing.value };
}

// ─── Moderation actions ─────────────────────────────────────

/**
 * Lock or unlock a post.
 *
 * Locked posts still display but the comment composer is disabled,
 * preventing new replies. Used by commanders (regional) and admins
 * (global) to freeze contentious threads.
 *
 * RLS allows: author (own post), commanders (regional board),
 * admins/super_admins (any board).
 */
export async function lockPost(postId: string, locked: boolean): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ is_locked: locked })
    .eq('id', postId);

  if (error) throw error;
}

/**
 * Soft-delete a post (moderator action).
 *
 * Sets deleted_at and clears the body/images, similar to comment
 * soft-delete. The post disappears from the feed (fetchPosts filters
 * by deleted_at IS NULL), but the database row is preserved for
 * audit/moderation logs.
 *
 * RLS allows: author (own post), commanders (regional board),
 * admins/super_admins (any board).
 */
export async function softDeletePost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({
      deleted_at: new Date().toISOString(),
      body: '[deleted]',
      image_urls: [],
    })
    .eq('id', postId);

  if (error) throw error;
}

// ─── Image upload ────────────────────────────────────────────

/**
 * Upload a processed image blob to Supabase Storage.
 *
 * The file is stored at: board-images/{userId}/{timestamp}-{random}.jpg
 * Returns the public URL of the uploaded image.
 *
 * The caller is responsible for client-side processing (resize,
 * compress, EXIF strip) before calling this function.
 */
export async function uploadBoardImage(
  userId: string,
  imageBlob: Blob,
  fileExtension: string = 'jpg'
): Promise<string> {
  // Generate a unique filename: timestamp + random suffix
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const filePath = `${userId}/${timestamp}-${random}.${fileExtension}`;

  const { error } = await supabase.storage
    .from('board-images')
    .upload(filePath, imageBlob, {
      contentType: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
      upsert: false,
    });

  if (error) throw error;

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('board-images')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}
