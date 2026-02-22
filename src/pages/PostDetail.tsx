import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  fetchPost,
  fetchComments,
  createComment,
  deleteComment,
  lockPost,
  pinPost,
  countPinnedPosts,
  softDeletePost,
  fetchBoardBySlug,
} from '../lib/boardsApi';
import type { Board } from '../lib/boardsApi';
import { TimeAgo } from '../components/boards/TimeAgo';
import { VoteButton } from '../components/boards/VoteButton';
import { ImageCarousel } from '../components/boards/ImageCarousel';
import { CommentItem } from '../components/boards/CommentItem';
import { ImageUploader } from '../components/boards/ImageUploader';
import { UserProfileModal } from '../components/boards/UserProfileModal';
import type { Post, Comment } from '../lib/boardsApi';
import type { CommentNode } from '../components/boards/CommentItem';

/**
 * PostDetail — full post display with Reddit-style threaded comments.
 *
 * Features:
 * - Full post: title, @username, time-ago, body, images, vote buttons
 * - Reddit-style nested comment tree with indentation and threading lines
 * - Collapsible comment branches (click threading line or [−] button)
 * - Sticky comment composer at bottom (like a chat input)
 * - Image attachment in comments (max 2)
 * - Clickable @usernames open a slide-up profile modal
 */

const MAX_COMMENT_IMAGES = 2;

/**
 * Build a tree of CommentNode objects from a flat chronological list.
 *
 * Each comment with reply_to_id === null is a root comment.
 * Each comment with a reply_to_id is attached as a child of its parent.
 * If the parent doesn't exist (deleted or out of scope), the comment
 * is promoted to root level so it's never lost.
 *
 * Children are ordered by created_at (ascending) since the flat list
 * from the API is already sorted chronologically.
 */
function buildCommentTree(flatComments: Comment[]): CommentNode[] {
  // Create a map of comment ID → CommentNode for O(1) parent lookups
  const nodeMap = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  // First pass: create CommentNode wrappers for every comment
  for (const comment of flatComments) {
    nodeMap.set(comment.id, { ...comment, children: [] });
  }

  // Second pass: attach each comment to its parent, or to roots
  for (const comment of flatComments) {
    const node = nodeMap.get(comment.id)!;

    if (comment.reply_to_id && nodeMap.has(comment.reply_to_id)) {
      // Parent exists — attach as child
      nodeMap.get(comment.reply_to_id)!.children.push(node);
    } else {
      // No parent (root comment) or orphaned (parent deleted) — treat as root
      roots.push(node);
    }
  }

  return roots;
}

export function PostDetail() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const { user, canModerateBoard, isAtLeast } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comment composer state
  const [commentBody, setCommentBody] = useState('');
  const [commentImages, setCommentImages] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // User profile modal state
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  // Load post and comments
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const [postData, commentData, boardData] = await Promise.all([
          fetchPost(id!),
          fetchComments(id!),
          slug ? fetchBoardBySlug(slug) : Promise.resolve(null),
        ]);

        if (cancelled) return;

        if (!postData) {
          setError('Post not found.');
        } else {
          setPost(postData);
          setComments(commentData);
          setBoard(boardData);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[PostDetail] Failed to load:', err);
          setError('Could not load post.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  // Build the comment tree from the flat list.
  // Memoised via useMemo would be cleaner but the dependency on
  // comments array identity makes it equivalent to just computing here.
  const commentTree = buildCommentTree(comments);

  // Handle reply to a specific comment
  function handleReply(commentId: string, authorName: string) {
    setReplyTo({ id: commentId, name: authorName });
    commentInputRef.current?.focus();
  }

  function clearReplyTo() {
    setReplyTo(null);
  }

  // Submit a new comment
  async function handleSubmitComment() {
    if (!post || !user || !commentBody.trim()) return;

    setSubmittingComment(true);
    try {
      await createComment(
        post.id,
        user.id,
        commentBody.trim(),
        commentImages,
        replyTo?.id
      );

      // Refresh comments after posting
      const updatedComments = await fetchComments(post.id);
      setComments(updatedComments);

      // Update post comment count locally
      setPost((prev) => prev ? {
        ...prev,
        comment_count: prev.comment_count + 1,
      } : prev);

      // Clear the composer
      setCommentBody('');
      setCommentImages([]);
      setReplyTo(null);
    } catch (err: any) {
      console.error('[PostDetail] Failed to post comment:', err);
      // Brief error — don't clear the user's input
      alert('Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  }

  // Handle soft-deleting a comment
  async function handleDeleteComment(commentId: string) {
    if (!post) return;

    try {
      await deleteComment(commentId);

      // Refresh comments to show the [deleted] placeholder
      const updatedComments = await fetchComments(post.id);
      setComments(updatedComments);

      // Decrement comment count locally
      setPost((prev) => prev ? {
        ...prev,
        comment_count: Math.max(prev.comment_count - 1, 0),
      } : prev);
    } catch (err: any) {
      console.error('[PostDetail] Failed to delete comment:', err);
      alert('Failed to delete comment. Please try again.');
    }
  }

  // Whether the current user has moderation powers on this board.
  // Computed from the board's scope_id (region) and the user's role/region.
  const canModerate = board ? canModerateBoard(board.scope_id) : false;

  // Handle locking/unlocking a post (moderator action)
  async function handleToggleLock() {
    if (!post) return;

    try {
      const newLocked = !post.is_locked;
      await lockPost(post.id, newLocked);
      setPost((prev) => prev ? { ...prev, is_locked: newLocked } : prev);
    } catch (err: any) {
      console.error('[PostDetail] Failed to toggle lock:', err);
      alert('Failed to lock/unlock post. Please try again.');
    }
  }

  /**
   * Whether the current user is super_admin — only super_admins can pin posts.
   * Pinning is a heavier moderation action than locking/deleting, so we
   * restrict it to the highest role for now.
   */
  const isSuperAdmin = isAtLeast('super_admin');

  /** Maximum pinned posts per board */
  const MAX_PINNED = 3;

  // Handle pinning/unpinning a post (super_admin only)
  async function handleTogglePin() {
    if (!post || !board) return;

    const newPinned = !post.is_pinned;

    // If pinning (not unpinning), check the limit
    if (newPinned) {
      try {
        const currentPinnedCount = await countPinnedPosts(board.id);
        if (currentPinnedCount >= MAX_PINNED) {
          alert(`Maximum ${MAX_PINNED} pinned posts allowed. Unpin one first.`);
          return;
        }
      } catch (err) {
        console.error('[PostDetail] Failed to count pinned posts:', err);
        alert('Failed to check pin limit. Please try again.');
        return;
      }
    }

    try {
      await pinPost(post.id, newPinned);
      setPost((prev) => prev ? { ...prev, is_pinned: newPinned } : prev);
    } catch (err) {
      console.error('[PostDetail] Failed to toggle pin:', err);
      alert('Failed to pin/unpin post. Please try again.');
    }
  }

  // Handle soft-deleting a post (moderator action)
  async function handleDeletePost() {
    if (!post) return;
    if (!confirm('Delete this post? This cannot be undone.')) return;

    try {
      await softDeletePost(post.id);
      // Navigate back to the board — the post will no longer appear
      navigate(`/boards/${slug}`);
    } catch (err: any) {
      console.error('[PostDetail] Failed to delete post:', err);
      alert('Failed to delete post. Please try again.');
    }
  }

  function handleCommentImageUploaded(url: string) {
    setCommentImages((prev) => [...prev, url]);
  }

  function handleCommentImageRemove(index: number) {
    setCommentImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleBack() {
    navigate(`/boards/${slug}`);
  }

  /** Open the user profile modal when a @username is clicked */
  function handleUsernameClick(userId: string) {
    setProfileUserId(userId);
  }

  if (loading) {
    return (
      <div className="post-detail-page">
        <div className="post-detail-loading">
          <div className="skeleton-block" style={{ height: '2rem', width: '70%' }} />
          <div className="skeleton-block" style={{ height: '1rem', width: '40%', marginTop: '0.5rem' }} />
          <div className="skeleton-block" style={{ height: '6rem', marginTop: '1rem' }} />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="post-detail-page">
        <p className="post-detail-error">{error || 'Post not found.'}</p>
        <button className="post-detail-back-btn" onClick={handleBack}>
          ← Back to board
        </button>
      </div>
    );
  }

  const authorUsername = post.author?.username || 'unknown';
  const authorRole = post.author?.role || 'member';
  const showPostcode = post.author?.display_postcode && post.author?.postcode_area;

  return (
    <div className="post-detail-page">
      {/* Back navigation */}
      <button className="post-detail-back-btn" onClick={handleBack}>
        ← {board?.name ?? 'Back'}
      </button>

      {/* Post content */}
      <article className="post-detail-content">
        {post.is_pinned && (
          <div className="post-card-pinned">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
            </svg>
            Pinned
          </div>
        )}

        <h1 className="post-detail-title">
          {post.is_locked && (
            <svg className="post-lock-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
          {post.title}
        </h1>

        <div className="post-detail-meta">
          <button className="username-link" onClick={() => handleUsernameClick(post.author_id)}>
            @{authorUsername}
          </button>
          <span className={`role-badge role-badge-${authorRole}`}>
            {authorRole === 'super_admin' ? 'admin' : authorRole}
          </span>
          {showPostcode && (
            <span className="postcode-badge">{post.author.postcode_area}</span>
          )}
          <span className="post-detail-dot">·</span>
          <TimeAgo timestamp={post.created_at} />
        </div>

        <div className="post-detail-body">{post.body}</div>

        {/* Post images */}
        {post.image_urls && post.image_urls.length > 0 && (
          <ImageCarousel imageUrls={post.image_urls} />
        )}

        {/* Vote + comment count */}
        <div className="post-detail-actions">
          {user && (
            <VoteButton
              targetType="post"
              targetId={post.id}
              currentUserId={user.id}
              initialCount={post.upvote_count}
            />
          )}
          <span className="post-detail-comment-count">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
          </span>
        </div>

        {/* Moderation toolbar — only visible to commanders (regional) and admins+ */}
        {canModerate && (
          <div className="post-mod-toolbar">
            {/* Pin button — super_admin only */}
            {isSuperAdmin && (
              <button
                className={`post-mod-btn ${post.is_pinned ? 'post-mod-btn-active' : ''}`}
                onClick={handleTogglePin}
                title={post.is_pinned ? 'Unpin this post' : 'Pin this post to the top (max 3)'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                </svg>
                {post.is_pinned ? 'Unpin' : 'Pin'}
              </button>
            )}
            <button
              className={`post-mod-btn ${post.is_locked ? 'post-mod-btn-active' : ''}`}
              onClick={handleToggleLock}
              title={post.is_locked ? 'Unlock this post' : 'Lock this post (disable comments)'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {post.is_locked ? (
                  <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>
                ) : (
                  <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></>
                )}
              </svg>
              {post.is_locked ? 'Unlock' : 'Lock'}
            </button>
            <button className="post-mod-btn post-mod-btn-danger" onClick={handleDeletePost}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete Post
            </button>
          </div>
        )}
      </article>

      {/* Comments section — rendered as a nested tree */}
      <div className="post-detail-comments">
        {commentTree.length === 0 && (
          <p className="post-detail-no-comments">
            No comments yet — be the first to reply.
          </p>
        )}

        {commentTree.map((rootComment) => (
          <CommentItem
            key={rootComment.id}
            comment={rootComment}
            depth={0}
            currentUserId={user?.id ?? ''}
            canModerate={canModerate}
            onReply={handleReply}
            onDelete={handleDeleteComment}
            onUsernameClick={handleUsernameClick}
          />
        ))}
      </div>

      {/* Sticky comment composer — only if post isn't locked */}
      {!post.is_locked && user && (
        <div className="comment-composer">
          {/* Reply-to indicator */}
          {replyTo && (
            <div className="comment-composer-reply-to">
              Replying to @{replyTo.name}
              <button onClick={clearReplyTo} className="comment-composer-reply-clear">
                ×
              </button>
            </div>
          )}

          {/* Image thumbnails in composer */}
          {commentImages.length > 0 && (
            <div className="comment-composer-images">
              {commentImages.map((url, i) => (
                <div key={url} className="comment-composer-image-thumb">
                  <img src={url} alt="" />
                  <button onClick={() => handleCommentImageRemove(i)}>×</button>
                </div>
              ))}
            </div>
          )}

          <div className="comment-composer-input-row">
            {/* Image upload for comments */}
            {commentImages.length < MAX_COMMENT_IMAGES && (
              <ImageUploader
                userId={user.id}
                onUploaded={handleCommentImageUploaded}
              />
            )}

            <textarea
              ref={commentInputRef}
              className="comment-composer-input"
              placeholder="Write a comment…"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              rows={1}
            />

            <button
              className="comment-composer-send"
              onClick={handleSubmitComment}
              disabled={!commentBody.trim() || submittingComment}
            >
              {submittingComment ? '…' : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Locked post notice — shown when the post is locked and user can't comment */}
      {post.is_locked && user && (
        <div className="post-locked-notice">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          This post has been locked. New comments are disabled.
        </div>
      )}

      {/* User profile modal — slides up when a @username is clicked */}
      <UserProfileModal
        userId={profileUserId}
        onDismiss={() => setProfileUserId(null)}
      />
    </div>
  );
}
