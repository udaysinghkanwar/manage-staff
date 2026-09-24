import type { MetadataRoute } from 'next'

// Drives "Add to Home Screen". `display: standalone` is what drops the Safari
// address bar so the shortcut opens like an app rather than a bookmark.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Staff Manager',
    short_name: 'Staff Manager',
    description: 'Staffing agency management dashboard',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8f8f8',
    theme_color: '#f8f8f8',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      // Maskable lets Android crop to its own shape without clipping the mark.
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
