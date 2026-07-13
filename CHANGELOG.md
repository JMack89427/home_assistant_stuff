# Changelog

All notable changes to this Home Assistant configuration are documented here.
This project adheres to [Semantic Versioning](https://semver.org/) for major structural changes.

## [Unreleased]

### Added

- **Manufacturing Dashboard — X1C 4 and X1C 6 Added to Fleet Grid**: Added both new Bambu X1 Carbon printers (`x1c_00m09a351803154` / X1C 4, `x1c_00m09a3c1301432` / X1C 6) to the Fleet overview `custom:imperial-fleet-grid` card's printer list. Previously, these two printers had dedicated individual dashboard views but were missing from the summary grid, leaving only 7 of 9 printers visible at a glance. Fleet grid now shows all active printers in normalized format: Bambu P1P, Flsun S1 Pro, Printz, RatRig, Magneto X, Prusa MK4S, X1C 5, X1C 4, X1C 6.

- **Manufacturing Dashboard — Fleet View Title Updated**: Renamed Fleet view heading from "Fabrication Fleet" to "Manufacturing Fleet" for consistency with the dashboard's plain-language title.

### Changed

- **Custom Lovelace Cards — Theme Variable Rebasing and De-Theming**: Completed the visual de-theming of the two active custom Lovelace cards (`imperial-fleet-grid` and `imperial-alert-panel`). Previously, both cards had hardcoded Star Wars Dark Side aesthetic (near-black backgrounds, red/amber/green sci-fi colors, monospace Courier New font, condensed Arial Narrow headers, all-caps text, decorative corner-pip elements, and scanline overlay effect). Rebased the shared CSS color/font token block (`const V`) onto Home Assistant's native theme CSS variables (`--error-color`, `--primary-color`, `--success-color`, `--warning-color`, `--card-background-color`, etc.) with sensible static fallbacks, allowing the cards to automatically track the user's active HA theme (including light/dark switching) instead of a hardcoded palette. Replaced themed fonts (`Courier New`, `Arial Narrow`) with standard stacks (`Roboto Mono` for tabular data, `Roboto` for UI text). Removed all-caps text transforms and decorative elements (corner pips, scanline overlay) from both card classes, converting hardcoded uppercase status strings to title case. Verified no conflicts with the project's `imperial_dark.yaml` theme file — no CSS variable name collisions. **Accepted Limitation**: A handful of derived alpha-blended color tokens (e.g., `--ir-dim`, `--ir-glow`) remain as static rgba values rather than deriving from theme-linked base colors, since CSS custom properties cannot cleanly compute alpha variants of `var()`-referenced colors without `color-mix()`, which has weaker browser support; this does not affect correctness. Eight other card classes in the same file (`ImperialHeader`, `ImperialPanel`, `ImperialReadout`, `ImperialButton`, `ImperialPrinterStatus`, `ImperialResponsiveColumns`, `ImperialClock`, `ImperialCamera`) were left untouched — no dashboard references them, so they retain the old aesthetic as legacy code; no YAML dashboard changes required. Internal version constant bumped from 2.8.0 to 2.9.0.

- **Lawn & Pool Dashboard — LUBA Mower Working Speed Setting**: Added settable LUBA mower target movement speed (`number.garden_luba_va624unr_working_speed`, 0.2–1.2 m/s) to the "Field Settings" entities card. Previously live but dashboard-hidden; follows the same pattern as cutting-pattern settings added earlier this session. Zero entity changes — presentation-layer only.

- **Lawn & Pool Dashboard — LUBA Mower Cutting Settings**: Surfaced 7 previously-hidden LUBA mower configuration parameters in the "Field Settings" entities card: Cutting Pattern, Perimeter Laps, Path Spacing, Cutting Angle, Angle Mode, Traversal Mode, and Turnaround Mode. These HA entities (`select.garden_luba_va624unr_cutting_path_mode`, `select.garden_luba_va624unr_perimeter_mowing_laps`, etc.) were live but not dashboard-exposed; now accessible without navigating to entity details. Zero entity changes — presentation-layer only.

- **Lawn & Pool Dashboard Zone Labels**: Updated Chopper (LUBA 3) zone switch labels in the Zones card from generic "Zone 1/2/3" to match manufacturer's physical area remap: "North Yard", "Back Yard", "South Yard" (Area 4 remains unmapped). Zone assignment now visible at a glance in the dashboard.

- **Zone-Rotation Lawn Mowing Automation**: Extended `chopper_auto_mow_clear_morning` automation to automatically cycle through the three yard zones on successive mow runs (North → Back → South → repeat). New `input_select.chopper_mow_rotation` helper in `packages/terrain.yaml` tracks the queued zone. Mowing now runs at 11:00 (moved from 10:30) with Saturday as a no-mow day. Rotation advances only after a successful `start_mowing` call — skipped days (rain, Saturday, mower not docked) leave the current zone's turn intact for the next successful run, preventing zone slots from being silently skipped. Dashboard note added to the Zones card explaining that zone toggles may be overridden by the next scheduled rotation at 11am.

### Changed

- **Lawn & Pool Dashboard — Task Button Grid Removed**: Deleted the "Task 1" / "Task 2" button grid card from the Lawn & Pool view. Both buttons were showing "Unavailable" in the live UI — functionality is now handled by the zone-rotation automation added earlier this session. Button entities remain in HA; dashboard presentation simplified.

- **Chopper Resume After Charge — Operating Window Extended to 2:00 AM**: Widened `chopper_resume_after_charge` automation's upper time bound from `18:00:00` to `02:00:00`. Original assumption (avoid evening darkness) did not apply — mower is silent and equipped with camera and headlight for night operation. New constraint: no mow cycle start after 2:00 AM. Window now spans 11:00–02:00 with overnight wraparound.

### Fixed

- **Chopper Lawn Mowing — Zone-Rotation Automation Start-Sequence Race Condition**: Fixed `chopper_auto_mow_clear_morning` automation failing to start mowing after zone selection. Root cause: zero-delay sequence of `switch.turn_off` (deselecting other zones) immediately followed by `lawn_mower.start_mowing` was racing against LUBA integration's laggy command propagation (state changes observed taking 15–20+ seconds to register). Mow start command issued before zone selection had settled, causing LUBA firmware to ignore or reject the start request. Fix: inserted 10-second `delay` between zone-switch changes and the `start_mowing` call, matching the precedent set by `chopper_resume_after_charge` (which uses a 2-minute settle delay before its own `start_mowing` call for a different reason — battery-reading stabilization). Automation now reliably starts mowing on manual trigger and scheduled runs.

- **Manufacturing Dashboard — X1C 5 Power Button Entity Mismatch**: Fixed Power On/Off buttons in the X1C 5 view targeting incorrect entity `switch.maker_space_x1c_5_smart_plug` (bare Matter-integration duplicate with no energy monitoring) instead of `switch.maker_space_x1c_5_smart_plug_kp125m` (real TP-Link-integrated plug). The view's own "Power — Smart Plug" sensor section was already correctly reading from the TP-Link entity, creating an inconsistency: toggling power would affect the wrong plug (no visible feedback on dashboard). Corrected all power control buttons to target `switch.maker_space_x1c_5_smart_plug_kp125m` for consistent presentation and control. Zero entity changes — power control alignment only.

- **Chopper Lawn Mowing — Self-Healing Zone Switch Resolution**: Fixed `chopper_auto_mow_clear_morning` automation's zone rotation to survive LUBA integration entity_id reassignments. Root cause: the Mammotion/LUBA integration regenerates zone switch entity_ids on every restart or app-side zone edit (internal hashes change, causing switches like `switch.garden_luba_va624unr_area_north_lawn` → `..._area_north_lawn_2`), silently breaking hardcoded entity_id maps. Rewrote zone lookup to dynamically search `states.switch` for entities matching `switch.garden_luba_va624unr_area_*` by live `friendly_name` attribute ("North Lawn"/"Back Lawn"/"South Lawn") instead of trusting stored IDs — self-healing against future entity_id churn. Validated with Jinja2 template rendering against mock states for all three rotation values. **Dashboard Note**: The Zones card (`ui-lovelace.yaml`) was also updated to current live entity_ids (`..._area_north_lawn_2`, etc.), but Lovelace lacks dynamic resolution; card will require manual updates if the integration reassigns entity_ids again.

- **Chopper Resume After Charge — Broken Docked-State Condition**: Fixed `chopper_resume_after_charge` automation never firing despite battery repeatedly crossing the 90% resume threshold. Root cause: automation required `lawn_mower.garden_luba_va624unr == docked`, but the LUBA integration reports state as `paused` even when fully charged and sitting at the dock (not `docked`). Swapped condition to check `sensor.garden_luba_va624unr_device_position_type == "CHARGE_ON"` instead — more reliable physical dock indicator (unlike `binary_sensor.garden_luba_va624unr_charging`, which toggles off when battery tops out while still docked). Verified safety: a mower paused mid-lawn for an unrelated reason (obstacle, rain) would not report `CHARGE_ON`, correctly blocking erroneous resume in that case. **Known Follow-Up**: Four other automations (`chopper_auto_mow_clear_morning`'s own docked condition, `chopper_low_battery_dock`, `chopper_resume_after_rain`, `chopper_mow_complete`'s trigger) still rely on the same potentially-unreliable `docked` state and may share this latent issue — flagged for future investigation.

- **Chopper Lawn Mowing — Resume After Charge on Low-Battery Mid-Mow Dock**: Fixed critical gap in low-battery docking: when mower docked mid-task due to low battery (`chopper_low_battery_dock`), nothing resumed the interrupted zone after recharge. New automation `chopper_resume_after_charge` monitors for battery rising above 90% and automatically resumes mowing within the 11:00–18:00 operational window. New `input_boolean.chopper_battery_dock_active` helper (in `packages/terrain.yaml`) tracks whether a dock was triggered by mid-task low battery vs. a genuine mow completion. Helper is set by `chopper_low_battery_dock`, cleared on successful resume, and also cleared each morning by `chopper_auto_mow_clear_morning` to prevent stale flags from corrupting the next day's fresh rotation.

- **Chopper Lawn Mowing — False "Mow Complete" Notifications on Low-Battery Dock**: Fixed `chopper_mow_complete` automation firing notifications whenever the mower transitioned to docked state, including forced low-battery docks mid-task. Now suppresses "mow complete" notification when `input_boolean.chopper_battery_dock_active` is on, preventing false completion alerts during mid-task recharge cycles.

- **Chopper Resume After Rain — Stale Time-Window Lower Bound**: Corrected `chopper_resume_after_rain` automation's time-window lower bound from `10:30:00` to `11:00:00`, matching the scheduled mow's actual start time (mow was moved to 11am in an earlier session, but this window was not updated).

- **Lawn & Pool Dashboard — LUBA Zone Entity ID Reassignment (Fourth Occurrence)**: Updated Zones card entity references to match latest LUBA integration reload: `switch.garden_luba_va624unr_area_north_lawn` and `switch.garden_luba_va624unr_area_south_lawn` (reverted from prior-session `_2` suffixed versions). This is the fourth entity_id churn this session; root cause is the Mammotion/LUBA integration regenerating zone switch IDs on every restart. Automation (`chopper_auto_mow_clear_morning`) remains unaffected — it uses self-healing dynamic resolution by friendly_name (see "Chopper Lawn Mowing — Self-Healing Zone Switch Resolution"). Dashboard-only fix; no entity changes to automation logic.

- **Chopper Rain Delay Notification — Softened Wording for 7am Weather Check**: Reworded `chopper_rain_delay` notification messages (iPhone and iPad, kept identical to each other) to better communicate that the condition is a point-in-time weather check that is independently rechecked at the scheduled 11:00am mow time, not a final decision for the entire day. The automation has two trigger paths with different timing contexts (7:00am `morning_check` snapshot vs. mid-mow `forecast_change`), but both shared a notification claiming "Chopper mow delayed today" — causally misleading for the 7am case where weather could still clear by morning. New wording indicates this is an alert to check conditions, with the actual mow start decision deferred to the scheduled automation's fresh weather evaluation. No trigger or condition logic changed — notification text only.

- **Chopper Low Battery Dock — Debounced Trigger Against Sensor Glitches**: Added `for: "00:01:00"` debounce to `chopper_low_battery_dock` automation's trigger condition to filter transient battery sensor glitches. Live history confirms the LUBA battery sensor occasionally glitches to 0% for sub-second intervals during connectivity instability, then recovers to the actual level, spuriously firing low-battery notifications despite no genuine battery drain. Debounce requires the reading to stay below 20% for a full minute continuously before firing, suppressing false alerts while preserving response time to actual gradual battery decline. Matches the debounce pattern already used by `chopper_paused_too_long` automation. No other trigger or action logic changed.

- **Chopper Connection Watchdog — Fixed Config Entry ID (Was Reloading HACS Instead of Mammotion)**: Fixed `chopper_connection_watchdog` automation using the wrong config entry ID for its `homeassistant.reload_config_entry` service call. The automation fires when the LUBA connection sensor goes unavailable for 5+ minutes and attempts to recover the Mammotion integration by reloading its config entry. Root cause: the entry_id was incorrectly set to `01KG00YSDYK6AJ8M0QTCZ5GX2P` (verified via entity registry to be the live HACS integration config entry, backing 28 HACS-platform entities like `update.hacs_update` and `switch.hacs_pre_release`). Each watchdog trigger silently reloaded HACS instead of Mammotion — almost certainly a copy-paste error from initial automation setup. Corrected entry_id to `01KSQ4PQJK1Z1YJJR15V8VA5KG` (verified live config entry for all 96 current Mammotion/LUBA entities: `lawn_mower.garden_luba_va624unr`, `sensor.garden_luba_va624unr_battery`, `sensor.garden_luba_va624unr_connection`, etc.). Empirically tested: a manual reload against the corrected ID brought `lawn_mower.garden_luba_va624unr` from completely absent-from-state-machine back to a real state (docked, 100% battery, WIFI) within about one minute. Added inline comment to automation to prevent future confusion between Mammotion and HACS entry IDs.

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
