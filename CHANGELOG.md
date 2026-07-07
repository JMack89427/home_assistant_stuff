# Changelog

All notable changes to this Home Assistant configuration are documented here.
This project adheres to [Semantic Versioning](https://semver.org/) for major structural changes.

## [Unreleased]

### Added

- **Lawn & Pool Dashboard — LUBA Mower Working Speed Setting**: Added settable LUBA mower target movement speed (`number.garden_luba_va624unr_working_speed`, 0.2–1.2 m/s) to the "Field Settings" entities card. Previously live but dashboard-hidden; follows the same pattern as cutting-pattern settings added earlier this session. Zero entity changes — presentation-layer only.

- **Lawn & Pool Dashboard — LUBA Mower Cutting Settings**: Surfaced 7 previously-hidden LUBA mower configuration parameters in the "Field Settings" entities card: Cutting Pattern, Perimeter Laps, Path Spacing, Cutting Angle, Angle Mode, Traversal Mode, and Turnaround Mode. These HA entities (`select.garden_luba_va624unr_cutting_path_mode`, `select.garden_luba_va624unr_perimeter_mowing_laps`, etc.) were live but not dashboard-exposed; now accessible without navigating to entity details. Zero entity changes — presentation-layer only.

- **Lawn & Pool Dashboard Zone Labels**: Updated Chopper (LUBA 3) zone switch labels in the Zones card from generic "Zone 1/2/3" to match manufacturer's physical area remap: "North Yard", "Back Yard", "South Yard" (Area 4 remains unmapped). Zone assignment now visible at a glance in the dashboard.

- **Zone-Rotation Lawn Mowing Automation**: Extended `chopper_auto_mow_clear_morning` automation to automatically cycle through the three yard zones on successive mow runs (North → Back → South → repeat). New `input_select.chopper_mow_rotation` helper in `packages/terrain.yaml` tracks the queued zone. Mowing now runs at 11:00 (moved from 10:30) with Saturday as a no-mow day. Rotation advances only after a successful `start_mowing` call — skipped days (rain, Saturday, mower not docked) leave the current zone's turn intact for the next successful run, preventing zone slots from being silently skipped. Dashboard note added to the Zones card explaining that zone toggles may be overridden by the next scheduled rotation at 11am.

### Changed

- **Lawn & Pool Dashboard — Task Button Grid Removed**: Deleted the "Task 1" / "Task 2" button grid card from the Lawn & Pool view. Both buttons were showing "Unavailable" in the live UI — functionality is now handled by the zone-rotation automation added earlier this session. Button entities remain in HA; dashboard presentation simplified.

- **Chopper Resume After Charge — Operating Window Extended to 2:00 AM**: Widened `chopper_resume_after_charge` automation's upper time bound from `18:00:00` to `02:00:00`. Original assumption (avoid evening darkness) did not apply — mower is silent and equipped with camera and headlight for night operation. New constraint: no mow cycle start after 2:00 AM. Window now spans 11:00–02:00 with overnight wraparound.

### Fixed

- **Chopper Lawn Mowing — Self-Healing Zone Switch Resolution**: Fixed `chopper_auto_mow_clear_morning` automation's zone rotation to survive LUBA integration entity_id reassignments. Root cause: the Mammotion/LUBA integration regenerates zone switch entity_ids on every restart or app-side zone edit (internal hashes change, causing switches like `switch.garden_luba_va624unr_area_north_lawn` → `..._area_north_lawn_2`), silently breaking hardcoded entity_id maps. Rewrote zone lookup to dynamically search `states.switch` for entities matching `switch.garden_luba_va624unr_area_*` by live `friendly_name` attribute ("North Lawn"/"Back Lawn"/"South Lawn") instead of trusting stored IDs — self-healing against future entity_id churn. Validated with Jinja2 template rendering against mock states for all three rotation values. **Dashboard Note**: The Zones card (`ui-lovelace.yaml`) was also updated to current live entity_ids (`..._area_north_lawn_2`, etc.), but Lovelace lacks dynamic resolution; card will require manual updates if the integration reassigns entity_ids again.

- **Chopper Resume After Charge — Broken Docked-State Condition**: Fixed `chopper_resume_after_charge` automation never firing despite battery repeatedly crossing the 90% resume threshold. Root cause: automation required `lawn_mower.garden_luba_va624unr == docked`, but the LUBA integration reports state as `paused` even when fully charged and sitting at the dock (not `docked`). Swapped condition to check `sensor.garden_luba_va624unr_device_position_type == "CHARGE_ON"` instead — more reliable physical dock indicator (unlike `binary_sensor.garden_luba_va624unr_charging`, which toggles off when battery tops out while still docked). Verified safety: a mower paused mid-lawn for an unrelated reason (obstacle, rain) would not report `CHARGE_ON`, correctly blocking erroneous resume in that case. **Known Follow-Up**: Four other automations (`chopper_auto_mow_clear_morning`'s own docked condition, `chopper_low_battery_dock`, `chopper_resume_after_rain`, `chopper_mow_complete`'s trigger) still rely on the same potentially-unreliable `docked` state and may share this latent issue — flagged for future investigation.

- **Chopper Lawn Mowing — Resume After Charge on Low-Battery Mid-Mow Dock**: Fixed critical gap in low-battery docking: when mower docked mid-task due to low battery (`chopper_low_battery_dock`), nothing resumed the interrupted zone after recharge. New automation `chopper_resume_after_charge` monitors for battery rising above 90% and automatically resumes mowing within the 11:00–18:00 operational window. New `input_boolean.chopper_battery_dock_active` helper (in `packages/terrain.yaml`) tracks whether a dock was triggered by mid-task low battery vs. a genuine mow completion. Helper is set by `chopper_low_battery_dock`, cleared on successful resume, and also cleared each morning by `chopper_auto_mow_clear_morning` to prevent stale flags from corrupting the next day's fresh rotation.

- **Chopper Lawn Mowing — False "Mow Complete" Notifications on Low-Battery Dock**: Fixed `chopper_mow_complete` automation firing notifications whenever the mower transitioned to docked state, including forced low-battery docks mid-task. Now suppresses "mow complete" notification when `input_boolean.chopper_battery_dock_active` is on, preventing false completion alerts during mid-task recharge cycles.

- **Chopper Resume After Rain — Stale Time-Window Lower Bound**: Corrected `chopper_resume_after_rain` automation's time-window lower bound from `10:30:00` to `11:00:00`, matching the scheduled mow's actual start time (mow was moved to 11am in an earlier session, but this window was not updated).

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
