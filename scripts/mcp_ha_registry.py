#!/usr/bin/env python3
"""MCP server exposing Home Assistant area/device/entity registry CRUD.

HA does not expose config/*_registry/* commands as callable services (REST
/api/services/*), only as WebSocket admin commands — the same ones the
frontend's Settings UI uses. hass-mcp (ha_call_service etc.) therefore
cannot create/rename/delete areas or move devices/entities between areas.
This server fills that gap as reusable tools instead of one-off scripts
like migrate_areas.py.

Run: python3 mcp_ha_registry.py
Serves streamable-HTTP on http://127.0.0.1:8765/mcp (loopback only — this
holds a live HA admin token capable of destructive registry operations,
never bind it to 0.0.0.0). Keep this process running, then add it in
Claude's connector settings as a custom connector pointing at that URL.
"""
from __future__ import annotations

import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass

from mcp.server.fastmcp import Context, FastMCP

from ha_ws_client import ManagedConnection, get_base_url, get_token, raise_for_error


@dataclass
class AppContext:
    conn: ManagedConnection


@asynccontextmanager
async def app_lifespan(server: FastMCP) -> AsyncIterator[AppContext]:
    conn = ManagedConnection()
    try:
        yield AppContext(conn=conn)
    finally:
        await conn.aclose()


mcp = FastMCP(
    "ha-registry",
    instructions=(
        "Home Assistant area/device/entity registry admin tools "
        "(area create/rename/delete, device/entity area assignment). "
        "Use hass-mcp's ha_* tools for everything else (states, services, history) — "
        "HA does not expose registry CRUD as a callable service, only via this "
        "WebSocket admin API, which is what these tools wrap."
    ),
    lifespan=app_lifespan,
    host="127.0.0.1",  # loopback only -- never expose this off-machine
    port=8765,
)


def _conn(ctx: Context) -> ManagedConnection:
    return ctx.request_context.lifespan_context.conn


# ── Areas ─────────────────────────────────────────────────────────────────

@mcp.tool()
async def list_areas(ctx: Context) -> list[dict]:
    """List all Home Assistant areas."""
    areas = await _conn(ctx).call('list_areas')
    return [
        {"area_id": a["area_id"], "name": a["name"], "floor_id": a.get("floor_id")}
        for a in areas
    ]


@mcp.tool()
async def create_area(name: str, ctx: Context, force: bool = False) -> dict:
    """Create an area. Idempotent by default: if an area with this name
    (case-insensitive) already exists, returns it instead of creating a
    duplicate. Pass force=True to create a duplicate-named area anyway."""
    conn = _conn(ctx)
    if not force:
        for a in await conn.call('list_areas'):
            if a["name"].strip().lower() == name.strip().lower():
                return {"created": False, "area_id": a["area_id"], "name": a["name"]}
    resp = await conn.call('create_area', name)
    result = raise_for_error(resp, f"create_area({name!r})")
    return {"created": True, "area_id": result["area_id"], "name": result["name"]}


@mcp.tool()
async def rename_area(area_id: str, name: str, ctx: Context) -> dict:
    """Rename an area (area_id/slug is unchanged, only the display name)."""
    resp = await _conn(ctx).call('rename_area', area_id, name)
    result = raise_for_error(resp, f"rename_area({area_id!r}, {name!r})")
    return {"area_id": result["area_id"], "name": result["name"]}


@mcp.tool()
async def delete_area(area_id: str, ctx: Context, force: bool = False) -> dict:
    """Delete an area. Refuses by default if any devices or entities are
    still directly assigned to it (HA itself does NOT block this — it will
    silently unassign them). Pass force=True to delete anyway; affected
    devices/entities become unassigned (or entities fall back to their
    device's area)."""
    conn = _conn(ctx)
    if not force:
        devices = await conn.call('list_devices')
        entities = await conn.call('list_entities')
        blocking_devices = [
            {"device_id": d["id"], "name": d.get("name_by_user") or d.get("name")}
            for d in devices if d.get("area_id") == area_id
        ]
        blocking_entities = [
            {"entity_id": e["entity_id"]} for e in entities if e.get("area_id") == area_id
        ]
        if blocking_devices or blocking_entities:
            return {
                "deleted": False,
                "reason": "Area still has devices or entities directly assigned to it.",
                "blocking_devices": blocking_devices,
                "blocking_entities": blocking_entities,
                "hint": "Move them first, or call again with force=True to unassign them automatically.",
            }
    resp = await conn.call('delete_area', area_id)
    raise_for_error(resp, f"delete_area({area_id!r})")
    return {"deleted": True, "area_id": area_id}


# ── Devices ───────────────────────────────────────────────────────────────

def _compact_device(d: dict) -> dict:
    return {
        "device_id": d["id"],
        "name": d.get("name_by_user") or d.get("name"),
        "area_id": d.get("area_id"),
        "manufacturer": d.get("manufacturer"),
        "model": d.get("model"),
        "disabled_by": d.get("disabled_by"),
    }


@mcp.tool()
async def list_devices(ctx: Context, area_id: str | None = None, limit: int = 200) -> dict:
    """List devices, optionally filtered by area_id. Compact projection —
    excludes verbose fields like connections/identifiers/config_entries."""
    devices = await _conn(ctx).call('list_devices')
    if area_id is not None:
        devices = [d for d in devices if d.get("area_id") == area_id]
    total = len(devices)
    page = devices[:limit]
    return {
        "total_matching": total,
        "returned": len(page),
        "truncated": len(page) < total,
        "devices": [_compact_device(d) for d in page],
    }


@mcp.tool()
async def move_device(device_id: str, area_id: str | None, ctx: Context) -> dict:
    """Assign a device to an area. area_id=None clears the device's area."""
    resp = await _conn(ctx).call('move_device', device_id, area_id)
    result = raise_for_error(resp, f"move_device({device_id!r}, {area_id!r})")
    return {"device_id": device_id, "area_id": result.get("area_id")}


# ── Entities ──────────────────────────────────────────────────────────────

def _compact_entity(e: dict) -> dict:
    return {
        "entity_id": e["entity_id"],
        "name": e.get("name") or e.get("original_name"),
        "area_id": e.get("area_id"),
        "device_id": e.get("device_id"),
        "disabled_by": e.get("disabled_by"),
        "hidden_by": e.get("hidden_by"),
        "platform": e.get("platform"),
    }


@mcp.tool()
async def list_entities(
    ctx: Context,
    area_id: str | None = None,
    domain: str | None = None,
    name_contains: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """List entities with compact fields only, always capped by limit/offset.
    A raw entity_registry dump is ~2MB / thousands of entries on a typical
    HA instance and must never be returned unfiltered/unpaginated — filter
    by area_id and/or domain (e.g. "sensor") and/or name_contains, or page
    through with limit/offset."""
    entities = await _conn(ctx).call('list_entities')
    if area_id is not None:
        entities = [e for e in entities if e.get("area_id") == area_id]
    if domain is not None:
        entities = [e for e in entities if e["entity_id"].split(".", 1)[0] == domain]
    if name_contains is not None:
        needle = name_contains.lower()
        entities = [
            e for e in entities
            if needle in e["entity_id"].lower() or needle in (e.get("name") or "").lower()
        ]
    total = len(entities)
    page = entities[offset:offset + limit]
    return {
        "total_matching": total,
        "returned": len(page),
        "offset": offset,
        "limit": limit,
        "truncated": offset + len(page) < total,
        "entities": [_compact_entity(e) for e in page],
    }


@mcp.tool()
async def move_entity(entity_id: str, area_id: str | None, ctx: Context) -> dict:
    """Set an entity-level area override. area_id=None clears the override
    so the entity falls back to inheriting its device's area."""
    resp = await _conn(ctx).call('move_entity', entity_id, area_id)
    result = raise_for_error(resp, f"move_entity({entity_id!r}, {area_id!r})")
    return {"entity_id": entity_id, "area_id": result.get("area_id")}


if __name__ == "__main__":
    if not get_base_url() or not get_token():
        sys.exit("HA_URL and/or HA_TOKEN not set (check scripts/.env)")
    mcp.run(transport="streamable-http")
