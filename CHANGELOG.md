# Changelog

All notable changes to this Home Assistant configuration are documented here.
This project adheres to [Semantic Versioning](https://semver.org/) for major structural changes.

## [Unreleased]

## [2026-07-02]

### Changed

- **Lovelace Dashboard Redesign**: Full rewrite of `ui-lovelace.yaml` replacing Star Wars/Imperial theming with plain household naming. Dashboard reduced from 10 views to 8 through strategic merges:
  - Renamed "Kiosk" → "Home" (default landing view, unchanged function).
  - Renamed "Detention Block" → "Cameras".
  - Renamed "Ship Comms" → removed (consolidated into Media).
  - Merged "Operations" + "Life Support" → single "Climate" view for all environmental controls.
  - Renamed "Imperial Galley" → "Meals".
  - Renamed "Droid Bay" → "Vacuums".
  - Merged "Terrain Operations" + "Kamino Station" → "Lawn & Pool" for outdoor control and pool monitoring.
  - Renamed "Botanical Bay" → "Grow Room" (entity IDs unchanged — coordinated boundary with grow_sre repo).

- **Card Substitution**: Replaced all custom `imperial-*` card types with standard Lovelace cards throughout (`entities`, `tile`, `clock`, `picture-entity`, `picture-glance`). Retained `imperial-alert-panel` only (no standard-card equivalent for its dynamic low-battery/offline entity scanning).

- **Configuration Dashboard Titles**: Updated `configuration.yaml` lovelace dashboard titles to plain names:
  - "Imperial Command Center" → "Home".
  - "Cadet's Barracks" → "Cat's Room".
  - (Sidebar path/URL keys and `filename` references unchanged — bookmarks remain functional).

- **Zero Entity Changes**: No entity IDs were renamed or dropped. This was a presentation-layer redesign only, verified by full QA diff against `ui-lovelace.imperial.yaml.bak`.

### TODO (Follow-up)

- **ui-manufacturing.yaml** and **ui-cadets-barracks.yaml** still retain full Imperial theming internally (custom cards, Star Wars view naming). Scheduled for separate redesign pass to align with main dashboard.

### Security

- No changes.

### Deprecated

- No changes.
