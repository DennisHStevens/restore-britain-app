/**
 * MapView — the map tab page.
 *
 * Wraps RegionMap and the RegionBottomSheet. Tapping a region on the
 * map opens the bottom sheet with that region's details (name, member
 * count, Telegram link). Tapping the map background or swiping the
 * sheet down dismisses it.
 */

import { useState, useCallback } from 'react';
import { RegionMap } from '../components/map/RegionMap';
import { RegionBottomSheet } from '../components/map/RegionBottomSheet';

export function MapView() {
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  const handleRegionSelect = useCallback((regionId: string, _regionName: string) => {
    setSelectedRegionId(regionId);
  }, []);

  const handleDismiss = useCallback(() => {
    setSelectedRegionId(null);
  }, []);

  return (
    <>
      <RegionMap
        onRegionSelect={handleRegionSelect}
        onBackgroundClick={handleDismiss}
      />
      <RegionBottomSheet
        regionFeatureId={selectedRegionId}
        onDismiss={handleDismiss}
      />
    </>
  );
}
