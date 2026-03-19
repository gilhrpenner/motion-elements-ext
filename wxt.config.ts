import { defineConfig } from 'wxt';

export default defineConfig({
  outDir: 'dist',
  manifest: {
    name: 'Motion Element Capture',
    short_name: 'Element Capture',
    description:
      'Select elements on the current page, capture them as PNGs, and export their metadata.',
    permissions: ['activeTab', 'scripting', 'storage', 'downloads', 'tabs'],
    action: {
      default_title: 'Motion Element Capture',
    },
  },
});
