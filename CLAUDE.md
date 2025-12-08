# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Run the app in development mode (uses --dev flag, data stored in Mailspring-dev folder)
npm start

# Run with specific language
npm start -- --lang=de

# Build for distribution
npm run build

# Lint code (prettier + eslint)
npm run lint

# Run all tests
npm test

# Run tests for a specific window
npm run test-window

# TypeScript watch mode (type checking only, no emit)
npm run tsc-watch
```

## Architecture Overview

Mailspring is an Electron email client built with TypeScript and React. It uses a plugin architecture and Flux/Reflux for state management.

### Key Directories

- **app/src/** - Core application source code
  - **browser/** - Main process code (Electron main)
  - **flux/** - Flux architecture implementation
    - **actions.ts** - Global action definitions with window/global/main scopes
    - **models/** - Data models (Message, Thread, Contact, Account, etc.)
    - **stores/** - Flux stores (DatabaseStore, AccountStore, DraftStore, etc.)
    - **tasks/** - Background tasks for sync operations
    - **attributes/** - Model attribute types and matchers for queries
  - **components/** - Reusable React components
  - **services/** - Business logic services (search, transformers, etc.)
  - **extensions/** - Extension points (ComposerExtension, MessageViewExtension)
  - **registries/** - Component, extension, and service registries
  - **global/mailspring-exports.js** - Public API exported as `mailspring-exports` package

- **app/internal_packages/** - Built-in plugins (composer, activity, thread-list, etc.)
- **app/spec/** - Test files (Jasmine)
- **app/build/** - Grunt build tasks

### Plugin System

Plugins are located in `app/internal_packages/`. Each plugin has:
- `package.json` - Metadata and entry point
- `lib/main.ts` - Plugin activation/deactivation
- Components registered via `ComponentRegistry`
- Extensions registered via `ExtensionRegistry`

### Data Flow

1. **Actions** (`app/src/flux/actions.ts`) - Three scopes:
   - `window` - Current window only
   - `global` - Broadcast to all windows via IPC
   - `main` - Sent to main window only

2. **Stores** - Listen to actions, manage state, emit changes
3. **Components** - Subscribe to stores via decorators like `ListensToFluxStore`

### Database

- Uses SQLite via `better-sqlite3`
- `DatabaseStore` handles all queries
- Models define attributes with types from `app/src/flux/attributes/`
- Queries use a custom ORM with matchers

### Sync Engine

The sync engine is a separate C++ process (Mailspring-Sync). Communication happens through:
- `MailsyncBridge` - IPC bridge to sync process
- Tasks queued via `TaskQueue` store

### Key Patterns

- **mailspring-exports** - Core APIs available globally as `$m` in devtools
- **Component injection** - Use `ComponentRegistry.register()` with location roles
- **Extensions** - `ComposerExtension` and `MessageViewExtension` for hooks
- **Decorators** - `@ListensToFluxStore`, `@InflatesDraftClientId` for component enhancement

### Styling

- LESS for stylesheets
- Theme support via CSS variables
- RTL support via `rtlcss`
