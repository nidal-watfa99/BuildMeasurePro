/// <reference types="vite/client" />

/**
 * يجمع الكود المصدري للمشروع تلقائياً أثناء البناء (Vite import.meta.glob)
 * ليُستخدم في نافذة "الكود المصدري" وتنزيل ZIP من داخل التطبيق.
 */
const modules = import.meta.glob(
  [
    '/src/**/*.{ts,tsx,css,json}',
    '!/src/data/sourceFiles.ts',
    '/public/manifest.webmanifest',
    '/public/sw.js',
    '/index.html',
    '/package.json',
    '/tsconfig.json',
    '/vite.config.ts',
    '/metadata.json',
    '/README.md',
    '/LICENSE',
  ],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;

export const ALL_SOURCE_FILES: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, content]) => [path.replace(/^\//, ''), content])
);
