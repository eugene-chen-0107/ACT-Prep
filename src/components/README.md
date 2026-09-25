# Shared components

Reusable presentation primitives belong here. Keep feature-specific workflows in their corresponding `src/features/*` module.

## Design system

- Semantic CSS variables for color, typography, spacing, radii, elevations, and focus rings live in `src/app/globals.css`; Tailwind maps these tokens in `tailwind.config.ts`.
- `ui.tsx` exports `Button`, `Input`, `Dropdown`, `Card`, `CardHeading`, `Badge`, `Tabs`, `ProgressBar`, `Alert`, `Tooltip`, `Modal`, `LoadingState`, and `EmptyState`.
- Components use native controls and accessible roles/labels. Prefer semantic `tone` and `variant` props over local colors. The modal supports Escape/backdrop close and mobile bottom-sheet presentation; respect reduced-motion settings for additions.
- The `/design-system` route is a responsive interactive specimen page for tokens and component states, not a product page.
- `app-shell.tsx` and `app-shell.css` provide the shared desktop sidebar, responsive mobile navigation/drawer, workspace header, profile menu, and skip link. Workspace routes are grouped under `src/app/(workspace)`; navigation destinations currently render a shared placeholder until their product flows are implemented.

Example:

```tsx
import { Badge, Button, Card, CardHeading, ProgressBar } from '@/components/ui';

<Card padded>
  <CardHeading title="Practice progress" description="A little every day" action={<Badge tone="success">On track</Badge>} />
  <ProgressBar label="Weekly goal" value={6} max={8} />
  <Button className="mt-4">Continue practice</Button>
</Card>
```

Run `npm run typecheck`, `npm run lint`, and `npm run build` to verify changes.
