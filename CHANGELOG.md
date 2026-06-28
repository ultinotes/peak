# Change Log

All notable changes to the Peak extension are documented in this file.

## [Unreleased]

### Added

- Cursor breadcrumb in Peak panel action bar (split folder path + symbol chain at cursor; scrolls when long)
- Zoom overlay on inline and expanded diagrams; inline scroll pans, Ctrl+scroll zooms, +/- buttons on overlay

## [0.0.1] - 2026-06-26

### Added

- **Peak understand** command: call hierarchy, type/reference/implementation graphs, and file dependency Mermaid diagrams
- Settings for definition preview placement and cursor-follow updates
- In-panel layout toggle for definition snippet (right/bottom)
- Copy diagram code for the active tab

### Changed

- Peak panel opens beside the source file (markdown-preview style) instead of forced split layout
- Symbol tabs are additive — all available graphs shown, not exclusive fallback
- Outgoing file imports also discovered via document link provider
