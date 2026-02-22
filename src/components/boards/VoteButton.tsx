import { useState, useRef, useCallback, useEffect } from 'react';
import { castVote, fetchUserVotes } from '../../lib/boardsApi';

/**
 * VoteButton — upvote/downvote arrows with count between them.
 *
 * Optimistic UI: updates the count and highlight immediately when
 * the user taps, then rolls back if the API call fails.
 * Debounced to prevent double-tap issues — ignores taps within
 * 300ms of the last one.
 *
 * Colour states:
 * - Neutral: muted text colour
 * - Upvoted: primary brand colour on the up arrow
 * - Downvoted: muted/error colour on the down arrow
 */

interface VoteButtonProps {
  targetType: 'post' | 'comment';
  targetId: string;
  currentUserId: string;
  initialCount: number;
}

export function VoteButton({
  targetType,
  targetId,
  currentUserId,
  initialCount,
}: VoteButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);
  const [loaded, setLoaded] = useState(false);
  const lastTapTime = useRef(0);

  // Load the user's existing vote for this target
  useEffect(() => {
    fetchUserVotes(currentUserId, targetType, [targetId])
      .then((voteMap) => {
        setUserVote(voteMap.get(targetId) ?? null);
        setLoaded(true);
      })
      .catch((err) => {
        console.error('[VoteButton] Failed to fetch user vote:', err);
        setLoaded(true);
      });
  }, [currentUserId, targetType, targetId]);

  // Keep count in sync if parent re-renders with a new initialCount
  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const handleVote = useCallback(async (value: 1 | -1) => {
    // Debounce: ignore taps within 300ms
    const now = Date.now();
    if (now - lastTapTime.current < 300) return;
    lastTapTime.current = now;

    // Calculate what the optimistic update should be
    let optimisticDelta: number;
    let optimisticVote: 1 | -1 | null;

    if (userVote === value) {
      // Toggle off: removing the vote
      optimisticDelta = -value;
      optimisticVote = null;
    } else if (userVote === null) {
      // New vote
      optimisticDelta = value;
      optimisticVote = value;
    } else {
      // Flipping vote: delta is 2x the new value direction
      optimisticDelta = value - userVote;
      optimisticVote = value;
    }

    // Apply optimistic update immediately
    const previousCount = count;
    const previousVote = userVote;
    setCount((c) => c + optimisticDelta);
    setUserVote(optimisticVote);

    try {
      await castVote(currentUserId, targetType, targetId, value);
      // The trigger recalculates the real count — we trust our
      // optimistic value until the next full refresh.
    } catch (err) {
      // Rollback on error
      console.error('[VoteButton] Vote failed, rolling back:', err);
      setCount(previousCount);
      setUserVote(previousVote);
    }
  }, [count, userVote, currentUserId, targetType, targetId]);

  const upActive = userVote === 1;
  const downActive = userVote === -1;

  return (
    <div className="vote-button">
      <button
        className={`vote-arrow vote-up${upActive ? ' vote-active-up' : ''}`}
        onClick={() => handleVote(1)}
        disabled={!loaded}
        aria-label="Upvote"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      <span className={`vote-count${upActive ? ' vote-count-up' : ''}${downActive ? ' vote-count-down' : ''}`}>
        {count}
      </span>

      <button
        className={`vote-arrow vote-down${downActive ? ' vote-active-down' : ''}`}
        onClick={() => handleVote(-1)}
        disabled={!loaded}
        aria-label="Downvote"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}
