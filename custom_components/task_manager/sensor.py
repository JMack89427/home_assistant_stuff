"""Sensor platform for Household Task & Chore Manager."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, SIGNAL_TASK_MANAGER_UPDATED
from .manager import TaskManager

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up task_manager sensor based on a config entry."""
    manager: TaskManager = hass.data[DOMAIN]["manager"]
    async_add_entities([TaskManagerSummarySensor(manager)])


async def async_setup_platform(
    hass: HomeAssistant,
    config: dict[str, Any],
    async_add_entities: AddEntitiesCallback,
    discovery_info: dict[str, Any] | None = None,
) -> None:
    """Set up sensor platform from YAML configuration."""
    if DOMAIN in hass.data and "manager" in hass.data[DOMAIN]:
        manager: TaskManager = hass.data[DOMAIN]["manager"]
        async_add_entities([TaskManagerSummarySensor(manager)])


class TaskManagerSummarySensor(SensorEntity):
    """Representation of the Task Manager Summary sensor."""

    _attr_has_entity_name = True
    _attr_name = "Task Manager Summary"
    _attr_unique_id = "task_manager_summary_sensor"
    _attr_icon = "mdi:checkbox-marked-circle-outline"

    def __init__(self, manager: TaskManager) -> None:
        """Initialize the sensor."""
        self._manager = manager
        self._attr_native_value = 0
        self._attr_extra_state_attributes: dict[str, Any] = {}

    async def async_added_to_hass(self) -> None:
        """Register callbacks and subscribe to updates."""
        self._update_state()
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                SIGNAL_TASK_MANAGER_UPDATED,
                self._handle_manager_update,
            )
        )

    @callback
    def _handle_manager_update(self) -> None:
        """Handle signal from task manager."""
        self._update_state()
        self.async_write_ha_state()

    def _update_state(self) -> None:
        """Update internal attributes from manager."""
        summary = self._manager.get_summary()
        self._attr_native_value = summary.get("active_tasks", 0)
        self._attr_extra_state_attributes = {
            "total_tasks": summary.get("total_tasks", 0),
            "active_tasks": summary.get("active_tasks", 0),
            "todo_count": summary.get("todo_count", 0),
            "in_progress_count": summary.get("in_progress_count", 0),
            "overdue_count": summary.get("overdue_count", 0),
            "complete_count": summary.get("complete_count", 0),
            "assignees": summary.get("assignees", []),
            "tasks": self._manager.get_tasks(),
        }
