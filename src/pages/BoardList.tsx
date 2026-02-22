import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBoards } from '../lib/boardsApi';
import { TimeAgo } from '../components/boards/TimeAgo';
import type { Board } from '../lib/boardsApi';

/**
 * BoardList — lists all boards the user can see.
 *
 * National board is pinned to the top (sort_order=0) with a distinct
 * visual style. Regional boards follow alphabetically (sort_order=10).
 */

export function BoardList() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    fetchBoards()
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
  }, []);

  function handleBoardClick(slug: string) {
    navigate(`/boards/${slug}`);
  }

  // Split boards into national (pinned) and regional groups
  const nationalBoards = boards.filter(b => b.scope_type === 'national');
  const regionalBoards = boards.filter(b => b.scope_type === 'region');

  return (
    <div className="boards-page">
      <div className="boards-page-header">
        <h1 className="boards-page-title">gb/ Boards</h1>
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

      {/* National board(s) — pinned at top with distinct style */}
      {!loading && !error && nationalBoards.map((board) => (
        <button
          key={board.id}
          className="board-card board-card-pinned"
          onClick={() => handleBoardClick(board.slug)}
        >
          <div className="board-card-header">
            <span className="board-card-name">
              <span className="board-card-pin-icon">📌</span>
              gb/{board.slug}
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

      {/* Section divider between national and regional */}
      {!loading && !error && nationalBoards.length > 0 && regionalBoards.length > 0 && (
        <div className="boards-section-divider">
          <span className="boards-section-label">Regional Boards</span>
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
            <span className="board-card-name">gb/{board.slug}</span>
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
