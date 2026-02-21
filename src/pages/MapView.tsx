/**
 * MapView — the map tab page.
 *
 * Wraps RegionMap and handles the onRegionSelect callback.
 * For now, selection is logged to the console. Phase 1.5 will
 * open a bottom sheet with region details and Telegram link here.
 */

import { RegionMap } from '../components/map/RegionMap';

export function MapView() {
  const handleRegionSelect = (regionId: string, regionName: string) => {
    /* Phase 1.5 will open the bottom sheet here */
    console.log(`Selected: ${regionName} (${regionId})`);
  };

  return <RegionMap onRegionSelect={handleRegionSelect} />;
}
