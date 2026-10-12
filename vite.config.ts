// The player is served from a subpath (mckoss.com/image-gallery/), so asset
// URLs are relative.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
