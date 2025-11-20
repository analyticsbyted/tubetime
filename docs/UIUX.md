# UI/UX Design Guidelines & Changes

This document tracks UI/UX design decisions, guidelines, and changes for TubeTime. It serves as a reference for maintaining design consistency and documenting the evolution of the user interface.

## Design Philosophy

TubeTime follows a **"Data Heavy"** aesthetic inspired by Bloomberg terminals and Linear.app:
- High information density
- Dark mode with off-white/off-black colors (no pure white or pure black)
- Red accents for primary actions and highlights
- Monospace fonts for dates and IDs
- Clean, minimal interface with focus on functionality

## Color Palette

### Base Colors
- **Background**: `zinc-950` (#09090b) - Primary dark background
- **Surface**: `zinc-900` - Card backgrounds, elevated surfaces
- **Border**: `zinc-800` - Borders, dividers
- **Text Primary**: `zinc-100` (#f4f4f5) - Main text (off-white, not pure white)
- **Text Secondary**: `zinc-300` - Secondary text
- **Text Muted**: `zinc-400`, `zinc-500` - Muted text, placeholders

### Accent Colors
- **Primary Red**: `red-600` (#dc2626) - Primary actions, highlights
- **Red Hover**: `red-500` - Hover states
- **Red Dark**: `red-700` - Active/pressed states
- **Red Light**: `red-400` - Accent text, highlights

### Important Rules
- ❌ **Never use pure white** (`#FFFFFF` or `text-white`) - Use `text-zinc-100` instead
- ❌ **Never use pure black** (`#000000` or `bg-black`) - Use `bg-zinc-950` instead
- ✅ Always use off-white (`zinc-100`) and off-black (`zinc-950`) for softer contrast
- ✅ Maintain consistent color usage across all components

## Typography

### Font Families
- **Sans-serif**: System fonts (`-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', ...`)
- **Monospace**: `'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', ...` for:
  - Dates
  - Video IDs
  - Technical data
  - Code snippets

### Font Sizes
- **Headings**: `text-xl`, `text-lg` - Bold, tracking-tight
- **Body**: `text-sm`, `text-xs` - Regular weight
- **Labels**: `text-xs` - Uppercase, semibold, tracking-wider

## Component Patterns

### Buttons

#### Primary Action Button
```jsx
className="bg-red-600 hover:bg-red-500 text-zinc-100 rounded-xl font-medium transition-colors"
```
- Used for: Search, Submit, Queue actions
- Red background with off-white text
- Rounded corners (`rounded-xl`)

#### Secondary Button
```jsx
className="border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
```
- Used for: Favorites, Secondary actions
- Border style with hover effects

#### Sign In Button (Special)
```jsx
className="border border-red-600/50 bg-red-600/10 text-red-400 hover:bg-red-600/20 hover:border-red-500 hover:text-red-300"
```
- Border style with subtle red background
- Better contrast than solid red background
- Dropdown menu pattern for provider selection

### Cards

#### Video Card
- Background: `bg-zinc-900`
- Border: `border-zinc-800` (hover: `border-zinc-600`)
- Selected state: `border-red-500 ring-2 ring-red-500/20`
- Hover: `-translate-y-1` with shadow

#### Modal/Overlay Cards
- Background: `bg-zinc-900` or `bg-zinc-950`
- Border: `border-zinc-800`
- Shadow: `shadow-xl`
- Backdrop: `bg-zinc-950/80` with `backdrop-blur-sm`

### Form Elements

#### Input Fields
```jsx
className="bg-zinc-950 border border-zinc-700 text-zinc-100 focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
```
- Dark background (`zinc-950`)
- Border with focus ring
- Off-white text

#### Date Inputs
- Same as input fields
- Include `[color-scheme:dark]` for browser date picker

### Dropdown Menus

#### Sign In Dropdown
- Background: `bg-zinc-900`
- Border: `border-zinc-800`
- Menu items: `text-zinc-300` with `hover:bg-zinc-800 hover:text-zinc-100`
- Auto-closes on selection or outside click

## UI/UX Changes Log

### [2025-01-XX] - Color Consistency Update

**Changes:**
- Replaced all pure white (`text-white`) with off-white (`text-zinc-100`)
- Replaced all pure black overlays (`bg-black/*`) with zinc overlays (`bg-zinc-950/*`)
- Updated sign-in button styling for better contrast

**Files Modified:**
- `src/components/Header.jsx` - Dropdown menu hover states, YouTube icon
- `src/components/VideoCard.jsx` - YouTube overlay icon, checkmark icon
- `src/components/EnhancedSearchBar.jsx` - Search button text
- `src/components/CollectionModal.jsx` - Save button text, modal overlay
- `src/components/ActionBar.jsx` - Queue button text
- `src/components/SearchBar.jsx` - Search button text
- `src/components/FavoritesSidebar.jsx` - Overlay background
- `src/components/SearchHistory.jsx` - Overlay background

**Rationale:**
- Pure white and pure black create harsh contrast
- Off-white and off-black provide softer, more professional appearance
- Better readability and visual comfort
- Consistent with modern dark mode design practices

### [2025-01-XX] - Sign In Button Redesign

**Changes:**
- Replaced two separate provider buttons with single "Sign In" button
- Added dropdown menu for provider selection
- Improved button contrast (border style instead of solid background)
- Added provider icons (Google, GitHub) in dropdown menu

**Files Modified:**
- `src/components/Header.jsx` - Complete AuthButton component redesign

**Rationale:**
- Follows standard UI pattern: single button → dropdown menu
- Cleaner header appearance
- Better user experience with provider selection
- Improved contrast and readability

## Accessibility Considerations

### Color Contrast
- All text meets WCAG AA contrast requirements
- Off-white (`zinc-100`) on dark backgrounds provides sufficient contrast
- Red accents used sparingly for important actions

### Interactive Elements
- All buttons have clear hover states
- Focus states visible with ring indicators
- Keyboard navigation supported

### Visual Feedback
- Loading states with skeletons
- Toast notifications for actions
- Clear selected states for multi-select

## Future Considerations

### Potential Improvements
- [ ] Add keyboard shortcuts for common actions
- [ ] Implement focus trap in modals
- [ ] Add skip-to-content link
- [ ] Consider reduced motion preferences
- [ ] Add tooltips for icon-only buttons
- [ ] Implement dark/light theme toggle (if needed)

### Design System Evolution
- Monitor user feedback on color choices
- Consider additional accent colors if needed
- Refine spacing and sizing as needed
- Document component variants as they emerge

## References

- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- Design inspiration: Bloomberg Terminal, Linear.app

