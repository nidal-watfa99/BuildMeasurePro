const modules = import.meta.glob(
  [
    '/src/**/*.{ts,tsx,css,json}',
    '!/src/data/sourceFiles.ts',
    '/index.html',
    '/package.json',
    '/tsconfig.json',
    '/vite.config.ts',
    '/metadata.json',
    '/README.md',
  ],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;

export const ALL_SOURCE_FILES: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, content]) => [path.replace(/^\//, ''), content])
);
