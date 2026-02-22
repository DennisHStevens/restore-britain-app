/**
 * RegionMap — the centrepiece interactive map component.
 *
 * Renders all 12 UK regions as coloured, tappable polygons on a plain
 * sea-coloured background using MapLibre GL JS. No tile provider needed —
 * just GeoJSON polygons on a flat canvas.
 *
 * Features:
 * - Distinct muted colour per region via a match expression
 * - Tap/click to select a region (opens bottom sheet via callback)
 * - Smooth pinch-to-zoom and pan with inertia (MapLibre native)
 * - Bounded to the UK area with sensible zoom limits
 * - No selection outline or floating label — the bottom sheet handles
 *   all region detail display now.
 */

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import {
  REGION_COLOURS,
  REGION_NAMES,
} from './regionColours';

/**
 * Brand theme — imported at build time for map colour constants.
 * Keeps map colours in sync with brand/theme.json without
 * hardcoding hex values here.
 */
import theme from '../../../brand/theme.json';

/**
 * Static GeoJSON import — bundled at build time by Vite.
 *
 * WHY NOT fetch at runtime? MapLibre's internal blob: web worker cannot
 * reliably fetch URLs on Cloudflare Pages (the service worker doesn't
 * intercept blob-origin requests, so fetches fail silently). Even passing
 * a pre-fetched object to addSource still requires the worker to process
 * it for tiling, and that worker communication also fails in this env.
 *
 * By importing the GeoJSON statically, the data is embedded in the JS
 * bundle (~166KB, ~45KB gzipped) and available synchronously — no fetch,
 * no worker-fetch, no race conditions.
 */
import ukRegionsData from '../../data/uk-regions.json';

interface RegionMapProps {
  /** Called when a region is tapped/clicked — opens the bottom sheet. */
  onRegionSelect?: (regionId: string, regionName: string) => void;
  /** Called when the user taps the sea (not a region) — dismisses bottom sheet. */
  onBackgroundClick?: () => void;
}

/** Sea colour — soft blue background behind the land polygons */
const SEA_COLOUR = theme.colours.map.seaBackground;

/** White borders between regions */
const BORDER_COLOUR = theme.colours.map.regionBorder;
const BORDER_WIDTH = 1.5;

const MIN_ZOOM = 4.5;
const MAX_ZOOM = 8;

/**
 * Bounding box of all UK regions — used for fitBounds on initial load
 * so the map frames the entire UK regardless of viewport dimensions.
 * Covers from SW tip of Cornwall/Scilly to N tip of mainland Scotland.
 * Shetland and Orkney islands have been removed from the GeoJSON to
 * prevent the map skewing too far north-east on mobile viewports.
 */
const UK_BOUNDS: maplibregl.LngLatBoundsLike = [
  [-8.2, 49.9],  // Southwest corner (SW England + NI)
  [1.8, 59.2],   // Northeast corner (N Scotland mainland)
];

/**
 * Bounding box to prevent panning away from the UK entirely.
 * Generous enough to not feel restrictive, tight enough to keep
 * the map anchored to Britain.
 */
const MAX_BOUNDS: maplibregl.LngLatBoundsLike = [
  [-12, 49], // Southwest corner
  [3, 60],   // Northeast corner (tightened after Shetland/Orkney removal)
];

/**
 * Build a MapLibre match expression for region fill colours.
 * Falls back to a neutral grey for any unrecognised feature IDs.
 */
function buildColourExpression(
  colours: Record<string, string>
): maplibregl.ExpressionSpecification {
  const entries: (string | maplibregl.ExpressionSpecification)[] = ['match', ['get', 'id']];
  for (const [id, colour] of Object.entries(colours)) {
    entries.push(id, colour);
  }
  entries.push('#cccccc'); // fallback
  return entries as unknown as maplibregl.ExpressionSpecification;
}

export function RegionMap({ onRegionSelect, onBackgroundClick }: RegionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  /**
   * Handle a tap on a region — just notify the parent so it can open
   * the bottom sheet. No local selection state, no highlight, no label.
   */
  const handleRegionTap = useCallback(
    (regionId: string) => {
      const name = REGION_NAMES[regionId];
      if (!name) return;
      onRegionSelect?.(regionId, name);
    },
    [onRegionSelect]
  );

  /** Initialise the MapLibre map instance */
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      /**
       * Tile-free map style: just a background colour (the "sea") and our
       * GeoJSON source. No tile provider, no network requests for map tiles.
       * This is all we need for a regional overview map.
       */
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'sea-background',
            type: 'background',
            paint: { 'background-color': SEA_COLOUR },
          },
        ],
      },
      /**
       * Initial position is overridden by fitBounds below, but we need
       * a centre/zoom to construct the map. These are reasonable defaults
       * that will be immediately replaced.
       */
      center: [-3.5, 54.5],
      zoom: 5,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: MAX_BOUNDS,
      /* Disable rotation — it's confusing for a choropleth map */
      bearingSnap: 0,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      /* Disable the default MapLibre attribution control — we'll give
       * credit to ONS in the docs and a minimal attribution instead */
      attributionControl: false,
    });

    /* Disable keyboard rotation shortcuts */
    map.keyboard.disableRotation();

    /**
     * Fit the map to show all UK regions on initial load.
     * This adapts to any viewport size — phone portrait, desktop landscape,
     * tablet, etc. — so all 12 regions are always visible on first render.
     * Padding gives breathing room around the edges.
     */
    map.fitBounds(UK_BOUNDS, {
      padding: { top: 20, bottom: 20, left: 20, right: 20 },
      animate: false,
    });

    map.on('load', () => {
      /* Add the statically-imported GeoJSON as a source.
       * Data is already parsed (Vite imports JSON as objects). */
      map.addSource('regions', {
        type: 'geojson',
        data: ukRegionsData as unknown as GeoJSON.FeatureCollection,
        /* promoteId tells MapLibre which property to use as the feature ID
         * for feature-state operations (hover, selection, etc.) */
        promoteId: 'id',
      });

      /**
       * Region fill layer — each region gets a distinct colour.
       *
       * Opacity is 1.0 (fully opaque) by design. The muted/pastel appearance
       * comes from pre-blended colours in regionColours.ts, NOT from alpha.
       *
       * WHY: With fill-opacity < 1.0, WebGL alpha-composites each triangle
       * from the earcut triangulation individually. Where triangles share
       * edges or overlap by sub-pixel amounts (GPU float rounding), alpha
       * is applied twice, creating visible darker seams — the "diagonal
       * line" artefact that plagued Scotland and Wales. Fully opaque fills
       * eliminate this entirely. The pre-blended colours are mathematically
       * equivalent to the original colours at 0.85 opacity over the sea
       * background, so the visual result is identical.
       *
       * fill-antialias is also disabled to prevent any residual edge
       * rendering on internal triangulation seams.
       */
      map.addLayer({
        id: 'region-fills',
        type: 'fill',
        source: 'regions',
        paint: {
          'fill-color': buildColourExpression(REGION_COLOURS),
          'fill-opacity': 1.0,
          'fill-antialias': false,
        },
      });

      /* Region border layer — white lines between regions */
      map.addLayer({
        id: 'region-borders',
        type: 'line',
        source: 'regions',
        paint: {
          'line-color': BORDER_COLOUR,
          'line-width': BORDER_WIDTH,
        },
      });

      /* Pointer cursor on hover over regions */
      map.on('mouseenter', 'region-fills', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'region-fills', () => {
        map.getCanvas().style.cursor = '';
      });

      /* Tap/click handler — notify parent to open bottom sheet */
      map.on('click', 'region-fills', (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const regionId = feature.properties?.id as string;
        if (!regionId) return;

        handleRegionTap(regionId);
      });

      /* Clicking the sea (not a region) dismisses bottom sheet */
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['region-fills'],
        });
        if (features.length === 0) {
          onBackgroundClick?.();
        }
      });

      /**
       * Force a repaint after layers are added. MapLibre's render loop can
       * stall when source data arrives synchronously (from our static import)
       * after the initial style paint — the frame isn't automatically
       * scheduled. resize() recalculates the viewport, triggerRepaint()
       * queues the next render frame.
       */
      map.resize();
      map.triggerRepaint();
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // handleRegionTap is stable via useCallback, safe to include.
    // onBackgroundClick is also stable (useCallback in parent).
  }, [handleRegionTap, onBackgroundClick]);

  return (
    <div className="region-map-container" ref={containerRef}>
      {/* Minimal ONS data attribution */}
      <div className="map-attribution">
        Contains OS data &copy; Crown copyright
      </div>
    </div>
  );
}
