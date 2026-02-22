import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBoards } from '../lib/boardsApi';
import { TimeAgo } from '../components/boards/TimeAgo';
import { useAuth } from '../hooks/useAuth';
import type { Board } from '../lib/boardsApi';

/**
 * BoardList — lists boards the user has access to.
 *
 * Users see the national board (always) plus their own region's board.
 * National board is pinned to the top (sort_order=0) with a distinct
 * visual style. The user's regional board follows below.
 */

export function BoardList() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    let cancelled = false;

    fetchBoards(profile?.region_id)
      .then((data) => {
        if (!cancelled) {
          setBoards(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[BoardList] Failed to fetch boards:', err);
          setError('Could not load boards. Please try again.');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [profile?.region_id]);

  function handleBoardClick(slug: string) {
    navigate(`/boards/${slug}`);
  }

  /**
   * Split boards into pinned (national + user's own region) and other regional.
   * The user's own region board has sort_order=1 (set by fetchBoards),
   * so it appears alongside national (sort_order=0) in the pinned section.
   */
  const pinnedBoards = boards.filter(b => b.sort_order <= 1);
  const regionalBoards = boards.filter(b => b.sort_order > 1);

  return (
    <div className="boards-page">
      <div className="boards-page-header">
        <h1 className="boards-page-title">Boards</h1>
        <p className="boards-page-subtitle">Community discussion boards</p>
      </div>

      {loading && (
        <div className="boards-loading">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      )}

      {error && (
        <p className="boards-error">{error}</p>
      )}

      {!loading && !error && boards.length === 0 && (
        <p className="boards-empty">No boards available yet.</p>
      )}

      {/* Pinned boards — national + user's own region */}
      {!loading && !error && pinnedBoards.map((board) => (
        <button
          key={board.id}
          className="board-card board-card-pinned"
          onClick={() => handleBoardClick(board.slug)}
        >
          <div className="board-card-header">
            <span className="board-card-name">
              <span className="board-card-pin-icon">📌</span>
              {board.name}
            </span>
            <span className="board-card-post-count">
              {board.post_count} {board.post_count === 1 ? 'post' : 'posts'}
            </span>
          </div>
          {board.description && (
            <p className="board-card-description">{board.description}</p>
          )}
          <div className="board-card-footer">
            <TimeAgo timestamp={board.created_at} />
          </div>
        </button>
      ))}

      {/* Section divider between pinned and other regional boards */}
      {!loading && !error && pinnedBoards.length > 0 && regionalBoards.length > 0 && (
        <div className="boards-section-divider">
          <span className="boards-section-label">Other Regions</span>
        </div>
      )}

      {/* Regional boards — alphabetical */}
      {!loading && !error && regionalBoards.map((board) => (
        <button
          key={board.id}
          className="board-card"
          onClick={() => handleBoardClick(board.slug)}
        >
          <div className="board-card-header">
            <span className="board-card-name">{board.name}</span>
            <span className="board-card-post-count">
              {board.post_count} {board.post_count === 1 ? 'post' : 'posts'}
            </span>
          </div>
          {board.description && (
            <p className="board-card-description">{board.description}</p>
          )}
          <div className="board-card-footer">
            <TimeAgo timestamp={board.created_at} />
          </div>
        </button>
      ))}
    </div>
  );
}
