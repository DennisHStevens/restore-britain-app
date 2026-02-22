import { useState, useEffect } from 'react';

/**
 * TimeAgo — converts a timestamp string to a human-readable
 * relative time: "2m ago", "3h ago", "1d ago", etc.
 *
 * Updates every 60 seconds to stay fresh without hammering
 * the render loop. Uses a simple tiered calculation — no
 * external date library needed.
 */

interface TimeAgoProps {
  timestamp: string;
}

function formatTimeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
  if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 604800)}w ago`;

  // Older than ~30 days: show the date
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function TimeAgo({ timestamp }: TimeAgoProps) {
  const [text, setText] = useState(() => formatTimeAgo(timestamp));

  useEffect(() => {
    // Recalculate immediately when timestamp prop changes
    setText(formatTimeAgo(timestamp));

    // Update every 60 seconds for live feel
    const interval = setInterval(() => {
      setText(formatTimeAgo(timestamp));
    }, 60_000);

    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <span
      style={{ color: 'var(--colour-text-muted)', fontSize: '0.8125rem' }}
      title={new Date(timestamp).toLocaleString('en-GB')}
    >
      {text}
    </span>
  );
}
