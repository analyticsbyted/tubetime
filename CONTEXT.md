# Project Context: TubeTime

This document provides a detailed history of the TubeTime project, including the initial vision, architectural decisions, development challenges, and their resolutions. It is intended to provide a smooth handover to any future developer or LLM model.

## Initial Vision

The project began with a clear vision from the user: a React application called 'TubeTime' to serve as the frontend for a future video transcription pipeline.

**Phase 1 (Current):** A historical YouTube search engine.
-   **Functionality:** Allows users to search for YouTube videos by query and date range, then curate a list of videos from the results.
-   **Tech Stack:** React (Vite), Tailwind CSS, Lucide React.
-   **Key Features:**
    -   Search bar with query, start date, and end date.
    -   A responsive grid of video cards, each with a selection checkbox.
    -   A floating "Action Bar" that appears when videos are selected.
    -   A "Queue for Transcription" button that simulates the future action by logging video IDs to the console and showing a toast notification.
    -   Robust API key management with support for `.env` files and a fallback settings modal.
-   **Aesthetic:** A "data-heavy" dark mode theme, similar to a Bloomberg terminal or Linear.app.

## Architectural Decisions

-   **State Management:** A custom `useSelection` hook was implemented to manage the set of selected video IDs. This provides a simple and contained way to handle selection state without a heavier state management library.
-   **API Abstraction:** The YouTube API logic was isolated into a `youtubeService.js` file. This separation of concerns makes the code cleaner and will make it easier to integrate with a backend (like Supabase) in the future.
-   **Styling:** Tailwind CSS was chosen for its utility-first approach, which is well-suited for rapid UI development and creating custom designs.
-   **Mobile-First Design:** A key requirement was that the application should be designed with a mobile-first orientation. This was implemented by using responsive prefixes (`sm:`, `md:`, etc.) in the Tailwind CSS classes.

## Development History & Challenges

The development process was not without its challenges. The most significant and persistent issue was related to the PostCSS and Tailwind CSS configuration within the Vite environment.

### The PostCSS Configuration Saga

1.  **Initial Setup:** The project was scaffolded with Vite and the necessary dependencies (`tailwindcss`, `postcss`, `autoprefixer`) were installed.
2.  **First Error:** The initial attempt to run the application resulted in an error: `[plugin:vite:css] [postcss] It looks like you're trying to use tailwindcss directly as a PostCSS plugin. The PostCSS plugin has moved to a separate package...`. This indicated an incompatibility between the version of Tailwind CSS (v4) and the PostCSS configuration.
3.  **First Attempted Fix:** The `postcss.config.js` was updated to use the new `@tailwindcss/postcss` package, and the Vite config was updated to explicitly point to the PostCSS config file. This led to a new error: `postcssConfig?.plugins.slice is not a function`. This error suggested that Vite was expecting the `plugins` property in the PostCSS config to be an array, but it was an object.
4.  **Second Attempted Fix:** The `postcss.config.js` was changed to export an array of plugins, in the more traditional PostCSS format. This, however, led back to the original error, as `tailwindcss` was being used directly as a plugin.
5.  **Resolution:** The final and correct solution was to use the array format for the `plugins` in `postcss.config.js`, but to import and use the `@tailwindcss/postcss` package as the plugin, not `tailwindcss`.

    **Correct `postcss.config.js`:**
    ```javascript
    import tailwindcss from '@tailwindcss/postcss';
    import autoprefixer from 'autoprefixer';

    export default {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    };
    ```
    The `vite.config.js` was also simplified to let Vite auto-detect the `postcss.config.js` file.

### Styling and Layout Issues

-   **Dark Mode:** The initial dark mode styles were not being applied correctly, resulting in a white background. This was resolved by applying the dark background color to the `html`, `body`, and `#root` elements in `src/index.css`.
-   **Form Elements:** The date input fields and the search button had white backgrounds due to default browser styling. This was fixed by adding `appearance-none` and explicit color classes to these elements in the `SearchBar.jsx` component.
-   **Layout Width:** The main content area was spanning the full width of the viewport. This was addressed by adding `max-w-7xl` and `mx-auto` to the `main` element in `App.jsx`.

### Tailwind CSS v4 Migration

6.  **Tailwind CSS v4 Setup:** The project was upgraded to Tailwind CSS v4.1.17, which introduced a new CSS import syntax:
    - **Old Syntax:** `@tailwind base; @tailwind components; @tailwind utilities;`
    - **New Syntax:** `@import "tailwindcss";`
    - The PostCSS configuration uses `@tailwindcss/postcss` plugin
    - This change resolved styling issues where Tailwind classes weren't being applied

### Design System Implementation

-   **Visual Redesign:** The application was redesigned to match a reference design with:
    - Red accent colors (`red-500`, `red-600`) instead of blue
    - Darker background (`zinc-950` instead of `zinc-900`)
    - Refined typography with monospace fonts for data elements
    - Improved spacing and layout constraints (`max-w-7xl`)
    - Enhanced hover effects and transitions
    - YouTube icon overlays on video cards
    - Calendar icons for date display

-   **Component Improvements:**
    - Search bar redesigned with labeled inputs and grid layout
    - Video cards with improved hover states and selection indicators
    - Action bar with better positioning and styling
    - Settings modal with improved UX and keyboard shortcuts
    - Loading states with spinner animations
    - Empty states with helpful messaging

## Current Status

The application is now in a stable, production-ready state:

✅ **Configuration:** PostCSS and Tailwind CSS v4 are properly configured  
✅ **Styling:** All Tailwind classes are being applied correctly  
✅ **Layout:** Responsive, mobile-first design with proper constraints  
✅ **Features:** All Phase 1 features are implemented and working  
✅ **Design:** Matches the reference design with red accents and dark theme  
✅ **API Integration:** YouTube API abstraction layer is complete  
✅ **State Management:** Multi-select functionality working correctly  

### Known Issues

None currently. The application is ready for Phase 2 development (backend integration with Supabase + Whisper).

### Future Enhancements (Phase 2)

- Backend integration with Supabase for video storage
- Whisper API integration for transcription
- Database schema for queued videos
- User authentication (if needed)
- Transcription status tracking
- Download/export functionality for transcripts
