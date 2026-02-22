/**
 * Quests — placeholder page for the upcoming quest/campaign system.
 *
 * This will eventually house the gamified task system where members
 * complete real-world and digital actions to earn points and climb
 * the leaderboard. For now, it's a "Coming Soon" placeholder.
 */

export function Quests() {
  return (
    <div className="quests-page">
      <div className="quests-coming-soon">
        {/* Target icon — matches the nav bar icon */}
        <svg
          className="quests-coming-soon-icon"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>

        <h2 className="quests-coming-soon-title">Quests</h2>
        <p className="quests-coming-soon-text">
          Coming soon. Complete real-world missions, earn points, and climb the
          leaderboard.
        </p>
      </div>
    </div>
  );
}
