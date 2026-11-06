"""WebSocket API for Task & Chore Manager."""
from __future__ import annotations

import logging
from typing import Any
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import (
    DOMAIN,
    RECURRENCE_CADENCES,
    RECURRENCE_NONE,
    RECURRENCE_UNITS,
    STATUS_CHOICES,
    STATUS_TODO,
    UNIT_DAYS,
)
from .manager import TaskManager

_LOGGER = logging.getLogger(__name__)


@callback
def async_register_websocket_api(hass: HomeAssistant, manager: TaskManager) -> None:
    """Register WebSocket commands for frontend card interaction."""

    @websocket_api.websocket_command(
        {
            vol.Required("type"): "task_manager/tasks",
        }
    )
    @callback
    def ws_get_tasks(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        """Handle request for all tasks and summary."""
        connection.send_result(
            msg["id"],
            {
                "tasks": manager.get_tasks(),
                "summary": manager.get_summary(),
            },
        )

    @websocket_api.websocket_command(
        {
            vol.Required("type"): "task_manager/create",
            vol.Required("title"): str,
            vol.Optional("description", default=""): str,
            vol.Optional("due_date"): vol.Any(str, None),
            vol.Optional("assigned_to", default=""): str,
            vol.Optional("is_recurring", default=False): bool,
            vol.Optional("recurrence_cadence", default=RECURRENCE_NONE): vol.In(RECURRENCE_CADENCES),
            vol.Optional("recurrence_interval", default=1): int,
            vol.Optional("recurrence_unit", default=UNIT_DAYS): vol.In(RECURRENCE_UNITS),
            vol.Optional("status", default=STATUS_TODO): vol.In(STATUS_CHOICES),
        }
    )
    @websocket_api.async_response
    async def ws_create_task(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        """Handle creating a task."""
        try:
            task = await manager.async_create_task(
                title=msg["title"],
                description=msg.get("description", ""),
                due_date=msg.get("due_date"),
                assigned_to=msg.get("assigned_to", ""),
                is_recurring=msg.get("is_recurring", False),
                recurrence_cadence=msg.get("recurrence_cadence", RECURRENCE_NONE),
                recurrence_interval=msg.get("recurrence_interval", 1),
                recurrence_unit=msg.get("recurrence_unit", UNIT_DAYS),
                status=msg.get("status", STATUS_TODO),
            )
            connection.send_result(msg["id"], {"success": True, "task": task.to_dict()})
        except Exception as err:
            _LOGGER.error("Failed to create task via WS: %s", err)
            connection.send_error(msg["id"], "create_failed", str(err))

    @websocket_api.websocket_command(
        {
            vol.Required("type"): "task_manager/update",
            vol.Required("task_id"): str,
            vol.Optional("title"): str,
            vol.Optional("description"): str,
            vol.Optional("due_date"): vol.Any(str, None),
            vol.Optional("assigned_to"): str,
            vol.Optional("is_recurring"): bool,
            vol.Optional("recurrence_cadence"): vol.In(RECURRENCE_CADENCES),
            vol.Optional("recurrence_interval"): int,
            vol.Optional("recurrence_unit"): vol.In(RECURRENCE_UNITS),
            vol.Optional("status"): vol.In(STATUS_CHOICES),
        }
    )
    @websocket_api.async_response
    async def ws_update_task(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        """Handle updating a task."""
        try:
            task_id = msg["task_id"]
            fields = {k: v for k, v in msg.items() if k not in ("id", "type", "task_id")}
            task = await manager.async_update_task(task_id, **fields)
            connection.send_result(msg["id"], {"success": True, "task": task.to_dict()})
        except Exception as err:
            _LOGGER.error("Failed to update task via WS: %s", err)
            connection.send_error(msg["id"], "update_failed", str(err))

    @websocket_api.websocket_command(
        {
            vol.Required("type"): "task_manager/complete",
            vol.Required("task_id"): str,
        }
    )
    @websocket_api.async_response
    async def ws_complete_task(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        """Handle completing a task."""
        try:
            task, was_rescheduled = await manager.async_complete_task(msg["task_id"])
            connection.send_result(
                msg["id"],
                {
                    "success": True,
                    "task": task.to_dict(),
                    "was_rescheduled": was_rescheduled,
                },
            )
        except Exception as err:
            _LOGGER.error("Failed to complete task via WS: %s", err)
            connection.send_error(msg["id"], "complete_failed", str(err))

    @websocket_api.websocket_command(
        {
            vol.Required("type"): "task_manager/set_status",
            vol.Required("task_id"): str,
            vol.Required("status"): vol.In(STATUS_CHOICES),
        }
    )
    @websocket_api.async_response
    async def ws_set_status(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        """Handle changing status directly."""
        try:
            task = await manager.async_set_status(msg["task_id"], msg["status"])
            connection.send_result(msg["id"], {"success": True, "task": task.to_dict()})
        except Exception as err:
            _LOGGER.error("Failed to set task status via WS: %s", err)
            connection.send_error(msg["id"], "set_status_failed", str(err))

    @websocket_api.websocket_command(
        {
            vol.Required("type"): "task_manager/delete",
            vol.Required("task_id"): str,
        }
    )
    @websocket_api.async_response
    async def ws_delete_task(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        """Handle deleting a task."""
        try:
            success = await manager.async_delete_task(msg["task_id"])
            connection.send_result(msg["id"], {"success": success})
        except Exception as err:
            _LOGGER.error("Failed to delete task via WS: %s", err)
            connection.send_error(msg["id"], "delete_failed", str(err))

    @websocket_api.websocket_command(
        {
            vol.Required("type"): "task_manager/subscribe",
        }
    )
    @callback
    def ws_subscribe_tasks(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        """Subscribe to live task manager events."""

        @callback
        def send_update() -> None:
            connection.send_message(
                websocket_api.event_message(
                    msg["id"],
                    {
                        "tasks": manager.get_tasks(),
                        "summary": manager.get_summary(),
                    },
                )
            )

        remove_listener = manager.register_listener(send_update)
        connection.subscriptions[msg["id"]] = remove_listener
        connection.send_result(msg["id"])
        # Send initial state right after subscription confirmation
        send_update()

    websocket_api.async_register_command(hass, ws_get_tasks)
    websocket_api.async_register_command(hass, ws_create_task)
    websocket_api.async_register_command(hass, ws_update_task)
    websocket_api.async_register_command(hass, ws_complete_task)
    websocket_api.async_register_command(hass, ws_set_status)
    websocket_api.async_register_command(hass, ws_delete_task)
    websocket_api.async_register_command(hass, ws_subscribe_tasks)
