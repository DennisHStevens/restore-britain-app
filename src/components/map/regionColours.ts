/**
 * Region colour palette and centroid lookup.
 *
 * Colours are muted, distinct neutrals that won't clash with any brand palette.
 * They'll be replaced with brand-consistent colours in Phase 1.8.
 *
 * Centroids are pre-computed approximate centres (average of bounding box corners)
 * for each region — used to position the floating label and as the flyTo target
 * for "Find My Region". Computing centroids from complex polygon geometry at
 * runtime would be wasteful for 12 static regions.
 */

/**
 * Pre-blended region fill colours — keyed by feature ID.
 *
 * These are the visual equivalent of the original muted colours at 0.85 opacity
 * over the sea background (#dbe9f4), but computed as solid RGB values.
 *
 * WHY: MapLibre triangulates polygons with earcut for WebGL rendering. When
 * fill-opacity < 1.0, each triangle is drawn semi-transparently. Where two
 * triangles share an edge or overlap by even a sub-pixel (GPU floating-point
 * rounding), alpha is applied twice, creating a visible darker seam — the
 * "diagonal line" artefact. Rendering at opacity 1.0 with pre-blended colours
 * eliminates this entirely because there's no alpha compositing to go wrong.
 *
 * Formula: solid = originalColour × 0.85 + seaColour × 0.15
 */
export const REGION_COLOURS: Record<string, string> = {
  // English regions
  E12000001: '#8aa8be', // North East — steel blue
  E12000002: '#97b29d', // North West — sage green
  E12000003: '#ab9e8e', // Yorkshire and The Humber — warm taupe
  E12000004: '#a59cbe', // East Midlands — muted purple
  E12000005: '#bba28e', // West Midlands — warm clay
  E12000006: '#8abdaf', // East of England — teal
  E12000007: '#bb9a9c', // London — dusky rose
  E12000008: '#98aebe', // South East — light slate
  E12000009: '#abbd8e', // South West — olive green

  // Devolved nations
  N92000002: '#98bdb3', // Northern Ireland — sea green
  S92000003: '#8a9cbe', // Scotland — highland blue
  W92000004: '#bb8c9e', // Wales — heather pink
};

/**
 * Pre-blended highlight colours for the selected state.
 * Same approach: originalHighlight × 0.95 + seaColour × 0.05
 */
export const REGION_COLOURS_HIGHLIGHT: Record<string, string> = {
  E12000001: '#618fae',
  E12000002: '#749e79',
  E12000003: '#958067',
  E12000004: '#8972ae',
  E12000005: '#ac8063',
  E12000006: '#61ad94',
  E12000007: '#ac7172',
  E12000008: '#718fae',
  E12000009: '#8ead63',
  N92000002: '#71ad99',
  S92000003: '#6175ae',
  W92000004: '#ac6279',
};

/**
 * Approximate centroids for each region.
 * Computed as the midpoint of the bounding box — good enough for label
 * positioning and flyTo targets. [longitude, latitude].
 */
export const REGION_CENTROIDS: Record<string, [number, number]> = {
  E12000001: [-1.72, 55.18],  // North East
  E12000002: [-2.66, 54.18],  // North West
  E12000003: [-1.42, 53.78],  // Yorkshire and The Humber
  E12000004: [-0.95, 52.83],  // East Midlands
  E12000005: [-1.97, 52.58],  // West Midlands
  E12000006: [0.52, 52.24],   // East of England
  E12000007: [-0.13, 51.51],  // London
  E12000008: [-0.75, 51.25],  // South East
  E12000009: [-3.30, 50.88],  // South West
  N92000002: [-6.85, 54.60],  // Northern Ireland
  S92000003: [-4.20, 56.82],  // Scotland
  W92000004: [-3.55, 52.13],  // Wales
};

/**
 * Human-readable names keyed by feature ID.
 * Duplicated from GeoJSON properties for convenience — avoids needing
 * to look up the GeoJSON feature just to get a name.
 */
export const REGION_NAMES: Record<string, string> = {
  E12000001: 'North East',
  E12000002: 'North West',
  E12000003: 'Yorkshire and The Humber',
  E12000004: 'East Midlands',
  E12000005: 'West Midlands',
  E12000006: 'East of England',
  E12000007: 'London',
  E12000008: 'South East',
  E12000009: 'South West',
  N92000002: 'Northern Ireland',
  S92000003: 'Scotland',
  W92000004: 'Wales',
};
