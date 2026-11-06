"""Household Task & Chore Manager custom integration."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import discovery
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN
from .manager import TaskManager
from .services import async_register_services
from .websocket import async_register_websocket_api

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.SENSOR]


async def _async_init_manager(hass: HomeAssistant) -> TaskManager:
    """Initialize TaskManager instance and load persistent storage."""
    if DOMAIN not in hass.data:
        hass.data[DOMAIN] = {}

    if "manager" not in hass.data[DOMAIN]:
        manager = TaskManager(hass)
        await manager.async_load()
        hass.data[DOMAIN]["manager"] = manager
        await async_register_services(hass, manager)
        async_register_websocket_api(hass, manager)
        _LOGGER.info("Household Task & Chore Manager initialized")

    return hass.data[DOMAIN]["manager"]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Task Manager component from configuration.yaml."""
    manager = await _async_init_manager(hass)

    if DOMAIN in config:
        # Load sensor platform via discovery if YAML configured
        hass.async_create_task(
            discovery.async_load_platform(
                hass, Platform.SENSOR, DOMAIN, {}, config
            )
        )

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Task Manager from a config entry."""
    manager = await _async_init_manager(hass)
    hass.data[DOMAIN][entry.entry_id] = entry

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok
