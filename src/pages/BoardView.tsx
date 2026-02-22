import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchBoardBySlug, fetchPosts } from '../lib/boardsApi';
import { SortTabs } from '../components/boards/SortTabs';
import { PostCard } from '../components/boards/PostCard';
import { UserProfileModal } from '../components/boards/UserProfileModal';
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

  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<SortMode>('hot');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User profile modal state
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

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

  return (
    <div className="board-view">
      {/* Board header */}
      {board && (
        <div className="board-view-header">
          <h1 className="board-view-title">gb/{board.slug}</h1>
          {board.description && (
            <p className="board-view-description">{board.description}</p>
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
            Be the first to start a discussion in gb/{board.slug}
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
