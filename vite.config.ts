import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    /* Generate source maps so Lighthouse's "Missing source maps" diagnostic
     * is resolved. hidden-source-map exposes maps to devtools but doesn't
     * add the sourceMappingURL comment to production bundles. */
    sourcemap: 'hidden',

    rollupOptions: {
      output: {
        /**
         * Code-split heavy dependencies so the login/register pages don't
         * download MapLibre GL JS (~800KB). Users only pull the map chunk
         * when they navigate to the Map tab (lazy-loaded via React.lazy).
         *
         * Also splits Supabase into its own chunk since it's shared across
         * many pages — better cache efficiency on repeat visits.
         */
        manualChunks: {
          'maplibre': ['maplibre-gl'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
