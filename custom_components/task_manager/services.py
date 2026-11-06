"""Services for Household Task & Chore Manager."""
from __future__ import annotations

import logging
import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv

from .const import (
    DOMAIN,
    RECURRENCE_CADENCES,
    RECURRENCE_NONE,
    RECURRENCE_UNITS,
    SERVICE_ASSIGN_TASK,
    SERVICE_COMPLETE_TASK,
    SERVICE_CREATE_TASK,
    SERVICE_DELETE_TASK,
    SERVICE_SET_STATUS,
    SERVICE_UPDATE_TASK,
    STATUS_CHOICES,
    STATUS_TODO,
    UNIT_DAYS,
)
from .manager import TaskManager

_LOGGER = logging.getLogger(__name__)

CREATE_TASK_SCHEMA = vol.Schema(
    {
        vol.Required("title"): cv.string,
        vol.Optional("description", default=""): cv.string,
        vol.Optional("due_date"): vol.Any(cv.string, None),
        vol.Optional("assigned_to", default=""): cv.string,
        vol.Optional("is_recurring", default=False): cv.boolean,
        vol.Optional("recurrence_cadence", default=RECURRENCE_NONE): vol.In(RECURRENCE_CADENCES),
        vol.Optional("recurrence_interval", default=1): cv.positive_int,
        vol.Optional("recurrence_unit", default=UNIT_DAYS): vol.In(RECURRENCE_UNITS),
        vol.Optional("status", default=STATUS_TODO): vol.In(STATUS_CHOICES),
    }
)

UPDATE_TASK_SCHEMA = vol.Schema(
    {
        vol.Required("task_id"): cv.string,
        vol.Optional("title"): cv.string,
        vol.Optional("description"): cv.string,
        vol.Optional("due_date"): vol.Any(cv.string, None),
        vol.Optional("assigned_to"): cv.string,
        vol.Optional("is_recurring"): cv.boolean,
        vol.Optional("recurrence_cadence"): vol.In(RECURRENCE_CADENCES),
        vol.Optional("recurrence_interval"): cv.positive_int,
        vol.Optional("recurrence_unit"): vol.In(RECURRENCE_UNITS),
        vol.Optional("status"): vol.In(STATUS_CHOICES),
    }
)

ASSIGN_TASK_SCHEMA = vol.Schema(
    {
        vol.Required("task_id"): cv.string,
        vol.Required("assigned_to"): cv.string,
    }
)

COMPLETE_TASK_SCHEMA = vol.Schema(
    {
        vol.Required("task_id"): cv.string,
    }
)

SET_STATUS_SCHEMA = vol.Schema(
    {
        vol.Required("task_id"): cv.string,
        vol.Required("status"): vol.In(STATUS_CHOICES),
    }
)

DELETE_TASK_SCHEMA = vol.Schema(
    {
        vol.Required("task_id"): cv.string,
    }
)


async def async_register_services(hass: HomeAssistant, manager: TaskManager) -> None:
    """Register all task_manager services."""

    async def handle_create_task(call: ServiceCall) -> None:
        await manager.async_create_task(
            title=call.data["title"],
            description=call.data.get("description", ""),
            due_date=call.data.get("due_date"),
            assigned_to=call.data.get("assigned_to", ""),
            is_recurring=call.data.get("is_recurring", False),
            recurrence_cadence=call.data.get("recurrence_cadence", RECURRENCE_NONE),
            recurrence_interval=call.data.get("recurrence_interval", 1),
            recurrence_unit=call.data.get("recurrence_unit", UNIT_DAYS),
            status=call.data.get("status", STATUS_TODO),
        )

    async def handle_update_task(call: ServiceCall) -> None:
        data = dict(call.data)
        task_id = data.pop("task_id")
        await manager.async_update_task(task_id, **data)

    async def handle_assign_task(call: ServiceCall) -> None:
        await manager.async_assign_task(
            task_id=call.data["task_id"],
            assigned_to=call.data["assigned_to"],
        )

    async def handle_complete_task(call: ServiceCall) -> None:
        await manager.async_complete_task(task_id=call.data["task_id"])

    async def handle_set_status(call: ServiceCall) -> None:
        await manager.async_set_status(
            task_id=call.data["task_id"],
            status=call.data["status"],
        )

    async def handle_delete_task(call: ServiceCall) -> None:
        await manager.async_delete_task(task_id=call.data["task_id"])

    hass.services.async_register(DOMAIN, SERVICE_CREATE_TASK, handle_create_task, schema=CREATE_TASK_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_UPDATE_TASK, handle_update_task, schema=UPDATE_TASK_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_ASSIGN_TASK, handle_assign_task, schema=ASSIGN_TASK_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_COMPLETE_TASK, handle_complete_task, schema=COMPLETE_TASK_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_SET_STATUS, handle_set_status, schema=SET_STATUS_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_DELETE_TASK, handle_delete_task, schema=DELETE_TASK_SCHEMA)
    _LOGGER.debug("Registered Task Manager services successfully")
