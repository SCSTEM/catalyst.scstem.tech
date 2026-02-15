---
name: shadcn
description: Add and customize shadcn/ui components in the web package. Load before adding new UI components.
---

# shadcn/ui in Catalyst

## Adding Components

Always run from the **`packages/web`** directory:

```bash
cd packages/web && bunx shadcn@latest add <component-name>
```

Examples:
```bash
cd packages/web && bunx shadcn@latest add dialog
cd packages/web && bunx shadcn@latest add dropdown-menu
cd packages/web && bunx shadcn@latest add table
cd packages/web && bunx shadcn@latest add skeleton
```

Add multiple at once:
```bash
cd packages/web && bunx shadcn@latest add dialog dropdown-menu table
```

## Project Configuration

The `components.json` config maps paths using the `@/` alias:

| Alias | Path | Purpose |
|-------|------|---------|
| `@/components/ui` | `src/components/ui/` | UI primitives (shadcn output) |
| `@/components` | `src/components/` | Feature components |
| `@/lib` | `src/lib/` | Utilities |
| `@/hooks` | `src/hooks/` | Custom hooks |

Settings: **new-york** style, **lucide** icons, **no RSC**, CSS variables enabled.

## Currently Installed Components

- `button` — `@/components/ui/button`
- `card` — `@/components/ui/card`
- `chart` — `@/components/ui/chart` (recharts integration)
- `input-otp` — `@/components/ui/input-otp`
- `tabs` — `@/components/ui/tabs`
- `tooltip` — `@/components/ui/tooltip`

## Using Components

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
```

## Theme & Styling

This project uses a **neobrutalist** theme with Tailwind v4. Key design tokens from `src/index.css`:

- **Colors:** oklch color space. Main accent is `--main` (yellow), dark background.
- **Borders:** Bold, black borders (`--border`)
- **Shadows:** Hard 4px offset shadows (`--shadow: 4px 4px 0px 0px var(--border)`)
- **Radius:** 5px base radius
- **Fonts:** Sora (sans), Inconsolata (mono)

When customizing shadcn components, maintain the neobrutalist visual style:
- Use hard shadows instead of subtle ones
- Keep borders visible and bold
- Use high-contrast color combinations
- Prefer `--main` for primary actions, `--secondary-background` for cards

## Customizing Components

shadcn components are copied into `src/components/ui/` — they're your code. Edit them directly. Do not override via wrapper components.

After adding a new component, run `bun run check` to ensure formatting is consistent.

## Dependencies

shadcn components may add Radix UI packages. These are managed automatically by the CLI. Current Radix dependencies:
- `@radix-ui/react-select`
- `@radix-ui/react-slot`
- `@radix-ui/react-tabs`
- `@radix-ui/react-tooltip`
- `radix-ui` (unified package)
