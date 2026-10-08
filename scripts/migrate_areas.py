#!/usr/bin/env python3
"""
Home Assistant area registry reorg — household room list migration.

Talks to HA's config WebSocket API (the same API the frontend uses for
Settings -> Areas & Zones and Settings -> Devices & Services). This is not
exposed as a callable `service`, only as WebSocket `config/*_registry/*`
commands, hence a standalone script instead of an automation/service call.

Usage:
    python migrate_areas.py            # dry run (default, no changes made)
    python migrate_areas.py --apply    # actually execute

Environment variables (set in scripts/.env or export before running):
    HA_URL      Base URL of your Home Assistant instance, e.g. http://homeassistant.local:8123
    HA_TOKEN    Long-lived access token (Profile -> Security -> Long-Lived Access Tokens)
"""

import argparse
import asyncio
import sys

from ha_ws_client import HAAuthError, HAConfigError, connect, ok

# ── The plan ─────────────────────────────────────────────────────────────

# Existing area_id -> new display name. area_id (the slug) is left unchanged
# so nothing that references the area_id directly (automations, dashboard
# area cards, etc.) breaks — only the human-readable name changes.
RENAMES = {
    'family_room': 'Fireplace Room',
    'living_room': 'Front Room',
    'master_bedroom': 'Primary Suite',
}

# Brand new areas to create.
NEW_AREAS = [
    'Kitchenette',
    'Piano Room',
    'Laundry',
    'Guest Bath',
    'Primary Bath',
    'Bathroom (2nd Level)',
    "Brent's Room",
    'Grow Room',
    'Basement Office',
    'I3D Storage',
    'Yard',
]

# device_id -> target area. Target is either an existing area_id (string,
# for RENAMES targets that keep their slug) or a name that must match one
# of NEW_AREAS above (resolved to its generated area_id at runtime).
DEVICE_MOVES = {
    # Spare Bedroom Temp/Humidity Sensor -- currently misassigned to
    # `bedroom` (Cat's Room); this is actually Brent's Room's sensor.
    '3d86d2eb8ceb2be82f53ce62e592f1bd': "Brent's Room",
    # Luba-VA624UNR (Chopper, LUBA mower) -- garden area is being retired,
    # unified into Yard.
    'd5e03618b81d30b69c02ea344a29dca0': 'Yard',
    # "Side" device -- outside_north area is being retired, unified into Yard.
    '5bcfe825541ab1f3e536e32d709d067a': 'Yard',
    # Roborock Qrevo Curv Series + its dock -- dining_room is being retired,
    # vacuum lives/docks in Piano Room now.
    '58f3bdee43a6e6efcf82e36d21e2c89c': 'Piano Room',  # Roborock Qrevo Curv Series
    'fe91f2303d711c35d865748420fd8420': 'Piano Room',  # Roborock Qrevo Curv Series Dock
}

# Set this to an existing area_id (e.g. 'kitchen') or a name from NEW_AREAS
# (e.g. 'Kitchenette'), then fill in the two None values above with this
# same variable. Left unset on purpose -- the script will refuse to --apply
# until it's set, rather than silently guessing where the vacuum should live.
ROBOROCK_AREA = 'Piano Room'

# Areas to delete once their devices have been moved out. Order matters:
# this must run AFTER the device moves above.
DELETE_AREAS = ['garden', 'outside_north', 'entertainment_room', 'dining_room']

# ── Migration steps ──────────────────────────────────────────────────────

async def run(apply: bool):
    if apply and ROBOROCK_AREA is None:
        sys.exit(
            "ROBOROCK_AREA is not set, and DEVICE_MOVES has two `None` entries "
            "for the Roborock vacuum + dock. Decide where they should live, "
            "set ROBOROCK_AREA, and fill in those two DEVICE_MOVES values, "
            "then re-run with --apply."
        )

    try:
        client = await connect()
    except (HAConfigError, HAAuthError) as e:
        sys.exit(str(e))
    print(f"Connected to {client.url}\n")

    created_area_ids = {}  # name -> area_id, for NEW_AREAS

    # Step 1: create new areas (idempotent -- skip any name that already
    # exists, so re-running after a partial failure doesn't create dupes)
    print("── Creating new areas ──")
    existing_by_name = {}
    if apply:
        existing_by_name = {a['name']: a['area_id'] for a in await client.list_areas()}
    for name in NEW_AREAS:
        if apply:
            if name in existing_by_name:
                created_area_ids[name] = existing_by_name[name]
                print(f"  = {name} -> {existing_by_name[name]} (already exists, skipped)")
                continue
            resp = await client.create_area(name)
            if not ok(resp):
                print(f"  FAILED: {name} -> {resp.get('error')}")
                continue
            area_id = resp['result']['area_id']
            created_area_ids[name] = area_id
            print(f"  + {name} -> {area_id}")
        else:
            print(f"  [dry-run] would create: {name}")

    # Step 2: rename existing areas
    print("\n── Renaming existing areas ──")
    for area_id, new_name in RENAMES.items():
        if apply:
            resp = await client.rename_area(area_id, new_name)
            status = "OK" if ok(resp) else f"FAILED: {resp.get('error')}"
            print(f"  {area_id} -> \"{new_name}\"  [{status}]")
        else:
            print(f"  [dry-run] would rename {area_id} -> \"{new_name}\"")

    # Step 3: move devices (resolve NEW_AREAS names to their created ids)
    print("\n── Moving devices ──")
    for device_id, target in DEVICE_MOVES.items():
        resolved = target
        if target in NEW_AREAS:
            resolved = created_area_ids.get(target) if apply else f"<{target}, not yet created>"
        if apply:
            resp = await client.move_device(device_id, resolved)
            status = "OK" if ok(resp) else f"FAILED: {resp.get('error')}"
            print(f"  {device_id} -> {target} ({resolved})  [{status}]")
        else:
            print(f"  [dry-run] would move {device_id} -> {target}")

    # Step 4: safety check + delete retired areas
    print("\n── Retiring old areas ──")
    if apply:
        devices = await client.list_devices()
        entities = await client.list_entities()
    for area_id in DELETE_AREAS:
        if apply:
            leftover_devices = [d['id'] for d in devices if d.get('area_id') == area_id]
            leftover_entities = [e['entity_id'] for e in entities if e.get('area_id') == area_id]
            if leftover_devices or leftover_entities:
                print(f"  SKIPPED {area_id}: still has devices {leftover_devices} "
                      f"or entities {leftover_entities} assigned. Not deleting.")
                continue
            resp = await client.delete_area(area_id)
            status = "OK" if ok(resp) else f"FAILED: {resp.get('error')}"
            print(f"  - {area_id}  [{status}]")
        else:
            print(f"  [dry-run] would delete: {area_id} (after verifying it's empty)")

    await client.close()
    print("\nDone." if apply else "\nDry run complete -- no changes made. Re-run with --apply to execute.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Actually execute the migration (default is dry-run)')
    args = parser.parse_args()
    asyncio.run(run(apply=args.apply))
