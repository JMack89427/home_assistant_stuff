# Changelog

All notable changes to this Home Assistant configuration are documented here.
This project adheres to [Semantic Versioning](https://semver.org/) for major structural changes.

## [Unreleased]

### Added

- **Lawn & Pool Dashboard Zone Labels**: Updated Chopper (LUBA 3) zone switch labels in the Zones card from generic "Zone 1/2/3" to match manufacturer's physical area remap: "North Yard", "Back Yard", "South Yard" (Area 4 remains unmapped). Zone assignment now visible at a glance in the dashboard.

- **Zone-Rotation Lawn Mowing Automation**: Extended `chopper_auto_mow_clear_morning` automation to automatically cycle through the three yard zones on successive mow runs (North → Back → South → repeat). New `input_select.chopper_mow_rotation` helper in `packages/terrain.yaml` tracks the queued zone. Mowing now runs at 11:00 (moved from 10:30) with Saturday as a no-mow day. Rotation advances only after a successful `start_mowing` call — skipped days (rain, Saturday, mower not docked) leave the current zone's turn intact for the next successful run, preventing zone slots from being silently skipped. Dashboard note added to the Zones card explaining that zone toggles may be overridden by the next scheduled rotation at 11am.

### Fixed

- **Chopper Zone-Rotation Mowing — Entity Remapping after Vendor App Remap**: User remapped/renamed LUBA 3 zones in the vendor app, causing Home Assistant's switch entity numbering to become misaligned with the mower's real zone index. Root cause: HA's entity_id slugs (`_area_1`, `_area_2`, etc.) are arbitrary registration-order assignments, not the vendor's actual zone numbers. Corrected zone-to-entity mapping in `chopper_auto_mow_clear_morning` automation and `input_select.chopper_mow_rotation` options: North Lawn → `switch.garden_luba_va624unr_area_area_3`, Back Lawn → `switch.garden_luba_va624unr_area_area_4`, South Lawn → `switch.garden_luba_va624unr_area_area_2`. Renamed zones from "Yard" to "Lawn" to match vendor app naming. Dashboard Zones card updated: dead `_area_1` row and generic "Zone 4" placeholder removed; now shows exactly 3 correctly-mapped rows matching the live mower switches.

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

- **Sibling Dashboard Redesign (Follow-up)**: Converted `ui-cadets-barracks.yaml` and `ui-manufacturing.yaml` to align with main dashboard standards:
  - **ui-cadets-barracks.yaml** (`Cat's Room`): Removed all custom `imperial-*` cards (imperial-header, imperial-button, imperial-panel). Replaced with standard markdown, tile, entities, and grid cards. Zero custom-card dependencies — `imperial-cards.js` resource block dropped entirely.
  - **ui-manufacturing.yaml** (`Manufacturing`): Converted most `imperial-*` cards to standard types. Intentionally **retained** `custom:imperial-fleet-grid` in Fleet view — this card performs cross-prefix printer normalization across Bambu/Klipper/PrusaLink integrations with no standard-card equivalent. Replaced custom icon-pack references (`local:galactic-republic`, `local:old-republic`) with `mdi:*` icons throughout.
  - **Known Tradeoff**: Flsun S1 Pro camera in manufacturing dashboard now displays sideways (was previously rotated 90° by removed `imperial-camera` custom card). User explicitly approved this tradeoff rather than keeping a single-use custom card.
  - Backups preserved: `ui-cadets-barracks.imperial.yaml.bak`, `ui-manufacturing.imperial.yaml.bak`.
  - Zero entity ID changes. Presentation-layer redesign only.

### Security

- No changes.

### Deprecated

- No changes.
