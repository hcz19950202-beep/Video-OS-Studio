# Video OS Studio Visual Identity

## 1. Workstation UI Identity — V1.1

The Studio UI is a high-density professional video workstation. It should feel precise, quiet and operational rather than like a consumer dashboard.

### UI character

- near-black flat canvas
- stepped charcoal panels
- fine borders instead of large cards
- orange-red focus accent
- high information density
- monospace micro-labels for timing, metrics and metadata
- minimal radius
- low decoration
- central preview remains the visual focus

### UI tokens

Dark theme:

- `#0B0C0E` — main workspace
- `#070809` — deepest canvas
- `#101114` — dock panels
- `#141519` — form / secondary surfaces
- `#292A30` — primary divider
- `#F3F3F1` — primary text
- `#85868D` — secondary text
- `#FF4B20` — active / selected / key action
- `#63BD88` — success
- `#E86767` — error / destructive

A warm neutral light theme is also available as a user preference. UI theme preference is not written to Project JSON.

### UI typography

- interface: system CJK-safe sans (`PingFang SC`, `Microsoft YaHei`, `Noto Sans CJK SC`, system fallback)
- workstation metrics / metadata: monospace
- section labels: restrained uppercase tracking
- do not use giant dashboard headings inside the editor

### UI interaction rules

- keep TIME / CARDS / DENSITY / PEAK / selection visible in the top status bar
- keep the Timeline visible during editing
- right Inspector edits only the selected card / caption
- left side owns project, global, assets and library entry points
- locale and UI theme persist locally
- Chinese / English switching must cover operational surfaces, not only navigation
- durable video state still changes only through Project Commands or bounded services

---

## 2. Generated Video / Motion Identity

The workstation UI identity is **not** the same thing as the branding of generated videos.

Generated video styling remains project / brand driven and should not automatically inherit the orange-red editor accent.

Default generated-motion guidance:

- precise, engineered and editorial
- motion clarifies information rather than decorates it
- use semantic project colors rather than arbitrary UI colors
- end-state layout must read clearly before motion is added
- fast controlled entrances, generally 0.35–0.7 second equivalents
- prefer directional slide, scale, progress and purposeful spatial movement
- hold finished information long enough to read

## 3. What NOT to Do

### Studio UI

- no giant rounded SaaS cards everywhere
- no rainbow gradients
- no glassmorphism for every control
- no decorative glows as a substitute for hierarchy
- no hiding critical timing/state in modal dialogs

### Generated motion

- no playful bounce-heavy motion by default
- no infinite loops
- no random/time-dependent animation
- no decorative motion competing with speech
- no hard-coded editor accent forced into every project
