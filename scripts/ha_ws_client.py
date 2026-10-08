"""Shared Home Assistant admin WebSocket API client.

Talks to HA's config WebSocket API (`config/*_registry/*` commands) — the
same API the frontend's Settings UI uses. This is not exposed as a callable
`service`, so anything that needs area/device/entity registry CRUD (as
opposed to calling services / reading state) goes through this module.

Used by:
  - migrate_areas.py    (one-off CLI migrations, uses HAClient + connect() directly)
  - mcp_ha_registry.py  (standing MCP server, uses ManagedConnection for
                          reconnect-on-drop across a long process lifetime)
"""
from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any

import websockets
from websockets.exceptions import ConnectionClosed

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / '.env')
except ImportError:
    pass  # dotenv optional


class HAConfigError(RuntimeError):
    """HA_URL / HA_TOKEN missing."""


class HAAuthError(RuntimeError):
    """WS handshake completed but auth was rejected, or handshake was malformed."""


class HAApiError(RuntimeError):
    """A config/*_registry/* command came back with success: false."""


def get_base_url() -> str:
    return os.getenv('HA_URL', '').rstrip('/')


def get_token() -> str:
    return os.getenv('HA_TOKEN', '')


def get_ws_url() -> str:
    base = get_base_url()
    if not base:
        raise HAConfigError("HA_URL is not set (check scripts/.env)")
    return base.replace('https://', 'wss://').replace('http://', 'ws://') + '/api/websocket'


class HAClient:
    """One authenticated WS session + the config/*_registry/* command set."""

    def __init__(self, ws, url: str):
        self.ws = ws
        self.url = url
        self._id = 1
        self._lock = asyncio.Lock()  # serialize req/resp pairs over one socket

    async def send(self, payload: dict[str, Any]) -> dict[str, Any]:
        async with self._lock:
            msg_id = self._id
            self._id += 1
            payload = {**payload, 'id': msg_id}
            await self.ws.send(json.dumps(payload))
            while True:
                raw = await self.ws.recv()
                resp = json.loads(raw)
                if resp.get('id') == msg_id:
                    return resp

    async def close(self) -> None:
        await self.ws.close()

    # Areas
    async def list_areas(self):
        return (await self.send({'type': 'config/area_registry/list'})).get('result', [])

    async def create_area(self, name):
        return await self.send({'type': 'config/area_registry/create', 'name': name})

    async def rename_area(self, area_id, name):
        return await self.send({'type': 'config/area_registry/update', 'area_id': area_id, 'name': name})

    async def delete_area(self, area_id):
        return await self.send({'type': 'config/area_registry/delete', 'area_id': area_id})

    # Devices
    async def list_devices(self):
        return (await self.send({'type': 'config/device_registry/list'})).get('result', [])

    async def move_device(self, device_id, area_id):
        return await self.send({'type': 'config/device_registry/update', 'device_id': device_id, 'area_id': area_id})

    # Entities
    async def list_entities(self):
        return (await self.send({'type': 'config/entity_registry/list'})).get('result', [])

    async def move_entity(self, entity_id, area_id):
        return await self.send({'type': 'config/entity_registry/update', 'entity_id': entity_id, 'area_id': area_id})


async def connect() -> HAClient:
    url = get_ws_url()
    # max_size=None: default 1MB frame limit is smaller than this HA instance's
    # full entity_registry/list response (~2MB) and kills the connection.
    ws = await websockets.connect(url, max_size=None)
    hello = json.loads(await ws.recv())
    if hello.get('type') != 'auth_required':
        raise HAAuthError(f'Unexpected handshake: {hello}')
    token = get_token()
    if not token:
        raise HAConfigError("HA_TOKEN is not set (check scripts/.env)")
    await ws.send(json.dumps({'type': 'auth', 'access_token': token}))
    auth_resp = json.loads(await ws.recv())
    if auth_resp.get('type') != 'auth_ok':
        raise HAAuthError(f'Auth failed: {auth_resp}')
    return HAClient(ws, url=get_base_url())


def ok(resp: dict) -> bool:
    return bool(resp.get('success'))


def raise_for_error(resp: dict, action: str) -> dict:
    """Return resp['result'] on success; raise HAApiError with HA's own error detail otherwise."""
    if not ok(resp):
        err = resp.get('error') or {}
        raise HAApiError(f"{action} failed: {err.get('code', 'unknown_error')} — {err.get('message', resp)}")
    return resp.get('result', {})


class ManagedConnection:
    """Long-lived wrapper around HAClient for processes that outlive a single
    request (i.e. the MCP server). Lazily connects on first use, and
    transparently reconnects once if the socket has dropped (HA restart)."""

    def __init__(self):
        self._client: HAClient | None = None
        self._lock = asyncio.Lock()

    async def call(self, method_name: str, *args, **kwargs):
        async with self._lock:
            for attempt in (1, 2):
                if self._client is None:
                    self._client = await connect()
                try:
                    return await getattr(self._client, method_name)(*args, **kwargs)
                except (ConnectionClosed, OSError):
                    self._client = None
                    if attempt == 2:
                        raise HAApiError(
                            "Lost connection to Home Assistant and the reconnect attempt "
                            "also failed. Check that HA is up and scripts/.env is correct."
                        )

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None
