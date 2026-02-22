import { useNavigate } from 'react-router-dom';
import { TimeAgo } from './TimeAgo';
import type { Post } from '../../lib/boardsApi';

/**
 * PostCard — reusable card for post list items in BoardView.
 *
 * Shows: title (bold), @username (blue link), time-ago, body preview
 * (first 2 lines truncated), image thumbnail if present,
 * upvote count, comment count. Tap navigates to PostDetail.
 *
 * Clicking the @username opens the UserProfileModal (handled by
 * the onUsernameClick callback) instead of navigating to the post.
 */

interface PostCardProps {
  post: Post;
  boardSlug: string;
  onUsernameClick?: (authorId: string) => void;
}

export function PostCard({ post, boardSlug, onUsernameClick }: PostCardProps) {
  const navigate = useNavigate();

  function handleClick() {
    navigate(`/boards/${boardSlug}/${post.id}`);
  }

  function handleAuthorClick(e: React.MouseEvent) {
    e.stopPropagation(); // Don't navigate to the post
    onUsernameClick?.(post.author_id);
  }

  // Truncate body to ~120 characters for the preview
  const bodyPreview = post.body.length > 120
    ? post.body.slice(0, 120).trimEnd() + '…'
    : post.body;

  const authorUsername = post.author?.username || 'unknown';
  const authorRole = post.author?.role || 'member';
  const showPostcode = post.author?.display_postcode && post.author?.postcode_area;

  return (
    <article className="post-card" onClick={handleClick}>
      {/* Pinned indicator */}
      {post.is_pinned && (
        <div className="post-card-pinned">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
          </svg>
          Pinned
        </div>
      )}

      {/* Title — with lock icon if locked */}
      <h3 className="post-card-title">
        {post.is_locked && (
          <svg className="post-lock-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}
        {post.title}
      </h3>

      {/* Author + role badge + postcode badge + time */}
      <div className="post-card-meta">
        <button className="username-link" onClick={handleAuthorClick}>
          @{authorUsername}
        </button>
        <span className={`role-badge role-badge-${authorRole}`}>
          {authorRole === 'super_admin' ? 'admin' : authorRole}
        </span>
        {showPostcode && (
          <span className="postcode-badge">{post.author.postcode_area}</span>
        )}
        <span className="post-card-dot">·</span>
        <TimeAgo timestamp={post.created_at} />
      </div>

      {/* Body preview */}
      <p className="post-card-body">{bodyPreview}</p>

      {/* Image thumbnail — show first image if present */}
      {post.image_urls && post.image_urls.length > 0 && (
        <div className="post-card-image">
          <img
            src={post.image_urls[0]}
            alt=""
            loading="lazy"
          />
          {post.image_urls.length > 1 && (
            <span className="post-card-image-count">
              +{post.image_urls.length - 1}
            </span>
          )}
        </div>
      )}

      {/* Stats row: upvotes and comments */}
      <div className="post-card-stats">
        <span className="post-card-stat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          {post.upvote_count}
        </span>
        <span className="post-card-stat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {post.comment_count}
        </span>
      </div>
    </article>
  );
}
