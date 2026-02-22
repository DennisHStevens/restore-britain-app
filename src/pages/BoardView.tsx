import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchBoardBySlug, fetchPosts, updateBoardDescription } from '../lib/boardsApi';
import { SortTabs } from '../components/boards/SortTabs';
import { PostCard } from '../components/boards/PostCard';
import { UserProfileModal } from '../components/boards/UserProfileModal';
import { useAuth } from '../hooks/useAuth';
import type { Board, Post, SortMode } from '../lib/boardsApi';

/**
 * BoardView — the post feed for a single board (e.g., /boards/national).
 *
 * Features:
 * - Sort tabs: Hot | New | Top
 * - Post list with PostCard components
 * - Floating "+" compose button (bottom-right, above nav)
 * - "Load more" cursor-based pagination
 * - Pull-to-refresh via a manual refresh button
 */

export function BoardView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAtLeast } = useAuth();

  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<SortMode>('hot');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User profile modal state
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  // Board description editing (super_admin only)
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  const isSuperAdmin = isAtLeast('super_admin');

  // Load board metadata
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    fetchBoardBySlug(slug)
      .then((data) => {
        if (!cancelled) {
          if (!data) {
            setError('Board not found.');
            setLoading(false);
          } else {
            setBoard(data);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[BoardView] Failed to load board:', err);
          setError('Could not load board.');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [slug]);

  // Load posts whenever board or sort changes
  const loadPosts = useCallback(async (boardId: string, sortMode: SortMode) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPosts(boardId, sortMode);
      setPosts(result.posts);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('[BoardView] Failed to load posts:', err);
      setError('Could not load posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (board) {
      loadPosts(board.id, sort);
    }
  }, [board, sort, loadPosts]);

  // Load more posts (pagination)
  async function handleLoadMore() {
    if (!board || loadingMore || posts.length === 0) return;
    setLoadingMore(true);
    try {
      const lastPost = posts[posts.length - 1];
      const result = await fetchPosts(board.id, sort, lastPost.created_at);
      setPosts((prev) => [...prev, ...result.posts]);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('[BoardView] Failed to load more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  // Refresh the feed
  function handleRefresh() {
    if (board) {
      loadPosts(board.id, sort);
    }
  }

  function handleSortChange(newSort: SortMode) {
    setSort(newSort);
    setPosts([]);
  }

  function handleNewPost() {
    navigate(`/boards/${slug}/new`);
  }

  /** Start editing the board description (super_admin only) */
  function startEditDescription() {
    setDescriptionDraft(board?.description || '');
    setEditingDescription(true);
  }

  /** Save the edited board description */
  async function saveDescription() {
    if (!board) return;
    setSavingDescription(true);
    try {
      await updateBoardDescription(board.id, descriptionDraft);
      setBoard((prev) => prev ? { ...prev, description: descriptionDraft.trim() || null } : prev);
      setEditingDescription(false);
    } catch (err) {
      console.error('[BoardView] Failed to update description:', err);
      alert('Failed to save description. Check your permissions.');
    } finally {
      setSavingDescription(false);
    }
  }

  return (
    <div className="board-view">
      {/* Back button + Board header */}
      <button className="board-view-back-btn" onClick={() => navigate('/boards')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Boards
      </button>

      {board && (
        <div className="board-view-header">
          <h1 className="board-view-title">{board.name}</h1>

          {/* Board description — editable for super_admin */}
          {editingDescription ? (
            <div className="board-view-desc-edit">
              <textarea
                className="board-view-desc-textarea"
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                placeholder="Board description..."
                rows={3}
                maxLength={500}
                autoFocus
              />
              <div className="board-view-desc-actions">
                <button
                  className="board-view-desc-cancel"
                  onClick={() => setEditingDescription(false)}
                  disabled={savingDescription}
                >
                  Cancel
                </button>
                <button
                  className="board-view-desc-save"
                  onClick={saveDescription}
                  disabled={savingDescription}
                >
                  {savingDescription ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {board.description && (
                <p className="board-view-description">{board.description}</p>
              )}
              {isSuperAdmin && (
                <button
                  className="board-view-edit-desc-btn"
                  onClick={startEditDescription}
                  title="Edit board description"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  {board.description ? 'Edit description' : 'Add description'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Sort tabs + refresh */}
      {board && (
        <div className="board-view-controls">
          <SortTabs active={sort} onChange={handleSortChange} />
          <button
            className="board-view-refresh"
            onClick={handleRefresh}
            title="Refresh"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <p className="board-view-error">{error}</p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="board-view-loading">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && posts.length === 0 && board && (
        <div className="board-view-empty">
          <p className="board-view-empty-title">No posts yet</p>
          <p className="board-view-empty-subtitle">
            Be the first to start a discussion in {board.name}
          </p>
        </div>
      )}

      {/* Post list */}
      {!loading && posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          boardSlug={slug ?? 'national'}
          onUsernameClick={(userId) => setProfileUserId(userId)}
        />
      ))}

      {/* Load more button */}
      {hasMore && !loading && (
        <button
          className="board-view-load-more"
          onClick={handleLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}

      {/* Floating compose button */}
      {board && !board.is_locked && (
        <button
          className="board-view-fab"
          onClick={handleNewPost}
          title="New post"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}
      {/* User profile modal — slides up when a @username is clicked */}
      <UserProfileModal
        userId={profileUserId}
        onDismiss={() => setProfileUserId(null)}
      />
    </div>
  );
}
