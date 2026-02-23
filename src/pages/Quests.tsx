/**
 * Quests — mission statement + feature roadmap page.
 *
 * Serves two purposes during the pre-alpha phase:
 * 1. Explains what the platform is and why it exists — so new members
 *    immediately understand the mission without needing external context.
 * 2. Shows the upcoming feature roadmap, ordered by expected delivery,
 *    so members know what's coming and feel the momentum.
 *
 * Once the quest system is built (Goal 2), this page will transform
 * into the actual gamified task interface. The mission statement may
 * move to an "About" section or stay as a header.
 */

import { useState } from 'react';

/** Each roadmap item describes a planned feature with its expected timeline. */
interface RoadmapItem {
  title: string;
  description: string;
  icon: string;
  timeline: string;
}

/**
 * Roadmap items ordered by expected delivery — nearest first.
 * Update these as priorities shift or features ship.
 */
const ROADMAP: RoadmapItem[] = [
  {
    title: 'Quests & Missions',
    description:
      'Complete real-world and digital tasks to earn points and climb the leaderboard. Leaflet drops, door-knocking, social media campaigns — all tracked and rewarded.',
    icon: '🎯',
    timeline: 'Next up',
  },
  {
    title: 'Better Media & Communications',
    description:
      'Richer posts with video embeds, polls, and formatted text. Notifications when someone replies to your posts or mentions you. Stay in the loop.',
    icon: '📡',
    timeline: 'Coming soon',
  },
  {
    title: 'Local Event Coordination',
    description:
      'Organise and discover local meetups, rallies, and canvassing sessions in your region. RSVP, share locations, and coordinate on the ground.',
    icon: '📍',
    timeline: 'Planned',
  },
  {
    title: 'Direct Messaging & Group Chat',
    description:
      'Private messaging between members and group chats for regional teams. Coordinate without leaving the platform.',
    icon: '💬',
    timeline: 'Planned',
  },
];

export function Quests() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  function toggleExpand(index: number) {
    setExpandedIndex(expandedIndex === index ? null : index);
  }

  return (
    <div className="quests-page-v2">
      {/* ── Mission Statement ──────────────────────────────────── */}
      <section className="quests-mission">
        <div className="quests-mission-badge">Pre-Alpha v0.1</div>
        <h1 className="quests-mission-title">Our Mission</h1>
        <p className="quests-mission-text">
          Restore Britain is a platform built by patriots, for patriots. Our
          distinct mission: <strong>get Rupert Lowe elected as Prime Minister
          at the 2029 General Election.</strong>
        </p>
        <p className="quests-mission-text">
          This platform is currently in its pre-alpha state — you're among the
          very first to use it. It's designed to help us organise effectively,
          both in person and online, so that we can be as impactful as possible.
          Every feature we build serves the mission.
        </p>
        <p className="quests-mission-text quests-mission-cta">
          This is just the beginning. Here's what's coming next.
        </p>
      </section>

      {/* ── Feature Roadmap ────────────────────────────────────── */}
      <section className="quests-roadmap">
        <h2 className="quests-roadmap-title">Roadmap</h2>
        <div className="quests-roadmap-list">
          {ROADMAP.map((item, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <button
                key={item.title}
                className={`quests-roadmap-card${isExpanded ? ' expanded' : ''}`}
                onClick={() => toggleExpand(i)}
                aria-expanded={isExpanded}
              >
                {/* Timeline connector line */}
                <div className="quests-roadmap-connector">
                  <div className={`quests-roadmap-dot${i === 0 ? ' next' : ''}`} />
                  {i < ROADMAP.length - 1 && <div className="quests-roadmap-line" />}
                </div>

                <div className="quests-roadmap-card-content">
                  <div className="quests-roadmap-card-header">
                    <span className="quests-roadmap-card-icon">{item.icon}</span>
                    <span className="quests-roadmap-card-title">{item.title}</span>
                    <span className={`quests-roadmap-card-timeline${i === 0 ? ' next' : ''}`}>
                      {item.timeline}
                    </span>
                  </div>
                  <div
                    className="quests-roadmap-card-body"
                    style={{
                      maxHeight: isExpanded ? '10rem' : '0',
                      opacity: isExpanded ? 1 : 0,
                      marginTop: isExpanded ? '0.625rem' : '0',
                    }}
                  >
                    <p>{item.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <p className="quests-footer">
        Have ideas for features? Post them on the National board — we're building
        this together.
      </p>
    </div>
  );
}
