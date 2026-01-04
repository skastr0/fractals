# Hide Next.js Debug Indicator

## Priority: P3 - Quality of Life

## Context
The Next.js development indicator (the "N" badge in the corner) is distracting and provides no value for this app. User reported it as "useless and noisy".

## Current State
The indicator appears automatically in Next.js development mode. It shows build status and allows quick navigation to Next.js tools.

## Acceptance Criteria
- [x] Next.js debug indicator hidden in development
- [x] No impact on development experience
- [x] Production builds unaffected (indicator doesn't appear anyway)

## Technical Notes

**Solution**: Add to `next.config.ts`:
```tsx
const config: NextConfig = {
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  // Or in newer Next.js versions:
  devIndicators: false,
}
```

**Alternative**: CSS override
```css
/* In globals.css */
[data-nextjs-dialog], 
[data-nextjs-toast] {
  display: none !important;
}
```

**Note**: The exact config option may vary by Next.js version. Check current next.config.ts and Next.js docs.

## Related Files
- `next.config.ts`
- Or `app/globals.css` for CSS approach

## Notes
- 2026-01-02: User reported as "useless and noisy"
- 2026-01-02: Added `devIndicators: false` in `next.config.ts`.
- 2026-01-02: Validation: `bun test` passed; `bun run build` passed.

## Blockers
- 2026-01-02: `bun run check` fails due to existing Biome formatting errors in `.cmap/cache/features/*.json` and `tsconfig.json` (not touched).
