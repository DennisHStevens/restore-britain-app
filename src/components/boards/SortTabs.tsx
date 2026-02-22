import type { SortMode } from '../../lib/boardsApi';

/**
 * SortTabs — Hot | New | Top toggle for post sorting.
 *
 * Pill-style buttons matching the brand's primary colour for
 * the active state. Same visual pattern as the bottom nav
 * active indicator.
 */

interface SortTabsProps {
  active: SortMode;
  onChange: (sort: SortMode) => void;
}

const TABS: { value: SortMode; label: string }[] = [
  { value: 'hot', label: 'Hot' },
  { value: 'new', label: 'New' },
  { value: 'top', label: 'Top' },
];

export function SortTabs({ active, onChange }: SortTabsProps) {
  return (
    <div className="sort-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          className={`sort-tab${active === tab.value ? ' sort-tab-active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
