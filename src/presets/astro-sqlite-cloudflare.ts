import type { Preset } from './types'

export const astroSqliteCloudflare: Preset = {
  id: 'astro-sqlite-cloudflare',
  name: 'Astro + libSQL + Cloudflare',
  tagline: 'Innholdstunge sider med Islands, libSQL ved kanten, Cloudflare Pages/Workers.',
  defaultConventions: [
    'MUST keep Astro pages static-first, opt into Islands only when interactive',
    'MUST run migrations through libSQL CLI, never edit the DB by hand',
    'MUST deploy to Cloudflare Pages or Workers — no Node-only APIs in adapters',
    'MUST NOT commit Turso/libSQL auth tokens',
    'SHOULD use Content Collections for any markdown-shaped data',
    'SHOULD keep client JS budget under 100 KB per page',
  ],
  stackContext: `Stack details for the planner and renderer:
- Astro 5 with Content Collections and selective Islands
- libSQL (Turso) for data, schema migrations in /migrations/*.sql
- Cloudflare Pages or Workers as deploy target (no Node std lib at runtime)
- View Transitions API for routing animations
- Tailwind for styling, prefers utility classes over component CSS

Conventions the team already follows:
- Content schemas typed via z.object in src/content/config.ts
- API endpoints in src/pages/api/ — keep them edge-safe
- Image optimization through @astrojs/image with avif/webp output
- Use wrangler for local dev against bindings`,
  skillBlueprints: [
    'astro-content-collections',
    'libsql-migration',
    'cloudflare-deploy',
    'git-commit',
  ],
}
