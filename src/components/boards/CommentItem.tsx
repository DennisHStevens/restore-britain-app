import { useState } from 'react';
import { TimeAgo } from './TimeAgo';
import { VoteButton } from './VoteButton';
import { ImageCarousel } from './ImageCarousel';
import type { Comment } from '../../lib/boardsApi';

/**
 * CommentItem — displays a single comment with Reddit-style nested threading.
 *
 * Each comment renders its children indented below it, creating a visual
 * tree structure. A vertical threading line on the left edge connects
 * parent to children. Clicking the threading line collapses that branch.
 *
 * Soft-deleted comments render as a "[deleted]" placeholder with no body,
 * images, or actions — but their children remain visible below them,
 * preserving the conversation thread (same as Reddit).
 */

/** Pixels of left margin per indentation level */
const INDENT_PX = 20;

export interface CommentNode extends Comment {
  /** Child comments (replies to this comment), built client-side */
  children: CommentNode[];
}

interface CommentItemProps {
  comment: CommentNode;
  depth: number;
  currentUserId: string;
  /** Whether the current user can moderate this board (commander in region or admin+) */
  canModerate: boolean;
  onReply: (commentId: string, authorName: string) => void;
  onDelete: (commentId: string) => void;
  onUsernameClick?: (authorId: string) => void;
}

export function CommentItem({ comment, depth, currentUserId, canModerate, onReply, onDelete, onUsernameClick }: CommentItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isDeleted = comment.deleted_at !== null;
  const authorUsername = isDeleted ? 'deleted' : (comment.author?.username || 'unknown');
  const authorRole = isDeleted ? 'member' : (comment.author?.role || 'member');
  const showPostcode = !isDeleted && comment.author?.display_postcode && comment.author?.postcode_area;
  const isOwnComment = !isDeleted && comment.author_id === currentUserId;
  // Moderators can delete any non-deleted comment (but not their own — that's already covered by isOwnComment)
  const canModDelete = !isDeleted && canModerate && !isOwnComment;


  function handleReply() {
    onReply(comment.id, authorUsername);
  }

  function handleAuthorClick() {
    if (!isDeleted) {
      onUsernameClick?.(comment.author_id);
    }
  }

  function handleCollapseToggle() {
    setCollapsed((prev) => !prev);
  }

  function handleDeleteClick() {
    setConfirmingDelete(true);
  }

  function handleDeleteConfirm() {
    setConfirmingDelete(false);
    onDelete(comment.id);
  }

  function handleDeleteCancel() {
    setConfirmingDelete(false);
  }

  // Soft-deleted comments with no replies: render nothing — there's
  // no thread to preserve, so the comment disappears entirely.
  if (isDeleted && comment.children.length === 0) {
    return null;
  }

  // Soft-deleted comments WITH replies: show a minimal "[deleted]"
  // placeholder so the thread below remains navigable (Reddit-style).
  if (isDeleted) {
    return (
      <div
        className="comment-thread"
        style={{ marginLeft: depth > 0 ? `${INDENT_PX}px` : '0' }}
      >
        {depth > 0 && (
          <button
            className="comment-thread-line"
            onClick={handleCollapseToggle}
            aria-label={collapsed ? 'Expand comment thread' : 'Collapse comment thread'}
            title={collapsed ? 'Expand thread' : 'Collapse thread'}
          />
        )}

        <div className="comment-thread-content">
          <div className="comment-meta">
            {depth === 0 && comment.children.length > 0 && (
              <button
                className="comment-collapse-btn"
                onClick={handleCollapseToggle}
                aria-label={collapsed ? 'Expand' : 'Collapse'}
              >
                {collapsed ? '[+]' : '[−]'}
              </button>
            )}
            <span className="comment-deleted-label">[deleted]</span>
            {collapsed && comment.children.length > 0 && (
              <span className="comment-collapsed-hint">
                ({comment.children.length} {comment.children.length === 1 ? 'reply' : 'replies'})
              </span>
            )}
          </div>

          {/* Children still render below the [deleted] placeholder */}
          {!collapsed && comment.children.length > 0 && (
            <div className="comment-children">
              {comment.children.map((child) => (
                <CommentItem
                  key={child.id}
                  comment={child}
                  depth={depth + 1}
                  currentUserId={currentUserId}
                  canModerate={canModerate}
                  onReply={onReply}
                  onDelete={onDelete}
                  onUsernameClick={onUsernameClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Normal (non-deleted) comment rendering
  return (
    <div
      className="comment-thread"
      style={{ marginLeft: depth > 0 ? `${INDENT_PX}px` : '0' }}
    >
      {/* The threading line — clickable to collapse. Only shown for depth > 0. */}
      {depth > 0 && (
        <button
          className="comment-thread-line"
          onClick={handleCollapseToggle}
          aria-label={collapsed ? 'Expand comment thread' : 'Collapse comment thread'}
          title={collapsed ? 'Expand thread' : 'Collapse thread'}
        />
      )}

      <div className="comment-thread-content">
        {/* Comment header: author, time, collapse toggle for root */}
        <div className="comment-meta">
          {depth === 0 && comment.children.length > 0 && (
            <button
              className="comment-collapse-btn"
              onClick={handleCollapseToggle}
              aria-label={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? '[+]' : '[−]'}
            </button>
          )}
          <button className="username-link" onClick={handleAuthorClick}>
            @{authorUsername}
          </button>
          <span className={`role-badge role-badge-${authorRole}`}>
            {authorRole === 'super_admin' ? 'admin' : authorRole}
          </span>
          {showPostcode && (
            <span className="postcode-badge">{comment.author.postcode_area}</span>
          )}
          <span className="comment-dot">·</span>
          <TimeAgo timestamp={comment.created_at} />
          {collapsed && (
            <span className="comment-collapsed-hint">
              ({comment.children.length} {comment.children.length === 1 ? 'reply' : 'replies'})
            </span>
          )}
        </div>

        {/* Comment body, images, actions — hidden when collapsed */}
        {!collapsed && (
          <>
            <p className="comment-body">{comment.body}</p>

            {comment.image_urls && comment.image_urls.length > 0 && (
              <ImageCarousel imageUrls={comment.image_urls} />
            )}

            <div className="comment-actions">
              <VoteButton
                targetType="comment"
                targetId={comment.id}
                currentUserId={currentUserId}
                initialCount={comment.upvote_count}
              />
              <button className="comment-action-btn" onClick={handleReply}>
                Reply
              </button>

              {/* Delete button — visible for own comments and moderators */}
              {(isOwnComment || canModDelete) && !confirmingDelete && (
                <button className="comment-action-btn comment-delete-btn" onClick={handleDeleteClick}>
                  {canModDelete ? 'Mod Delete' : 'Delete'}
                </button>
              )}

              {/* Delete confirmation — inline to avoid jarring modals */}
              {(isOwnComment || canModDelete) && confirmingDelete && (
                <span className="comment-delete-confirm">
                  <span className="comment-delete-confirm-text">Delete?</span>
                  <button className="comment-delete-confirm-yes" onClick={handleDeleteConfirm}>
                    Yes
                  </button>
                  <button className="comment-delete-confirm-no" onClick={handleDeleteCancel}>
                    No
                  </button>
                </span>
              )}
            </div>
          </>
        )}

        {/* Child comments — recursively rendered */}
        {!collapsed && comment.children.length > 0 && (
          <div className="comment-children">
            {comment.children.map((child) => (
              <CommentItem
                key={child.id}
                comment={child}
                depth={depth + 1}
                currentUserId={currentUserId}
                canModerate={canModerate}
                onReply={onReply}
                onDelete={onDelete}
                onUsernameClick={onUsernameClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
