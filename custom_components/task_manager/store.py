"""Persistent storage helper for Household Task & Chore Manager."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import (
    RECURRENCE_CUSTOM,
    RECURRENCE_DAILY,
    RECURRENCE_WEEKLY,
    STATUS_COMPLETE,
    STATUS_IN_PROGRESS,
    STATUS_TODO,
    STORAGE_KEY,
    STORAGE_VERSION,
    UNIT_DAYS,
)
from .models import Task

_LOGGER = logging.getLogger(__name__)


def get_default_seed_tasks() -> list[dict[str, Any]]:
    """Generate default seed tasks with real household context."""
    now = datetime.now(timezone.utc)
    yesterday = (now - timedelta(days=1, hours=4)).isoformat()
    today_evening = (now.replace(hour=20, minute=0, second=0, microsecond=0)).isoformat()
    tomorrow = (now + timedelta(days=1, hours=2)).isoformat()
    three_days_ago = (now - timedelta(days=3)).isoformat()
    three_days_later = (now + timedelta(days=3)).isoformat()

    return [
        {
            "id": "task_seed_001",
            "title": "Clean Roborock dustbin & check mop pad",
            "description": "Empty the primary robot vacuum collection bin and rinse washable filter.",
            "due_date": yesterday,
            "assigned_to": "Jason Cummings",
            "is_recurring": True,
            "recurrence_cadence": RECURRENCE_DAILY,
            "recurrence_interval": 1,
            "recurrence_unit": UNIT_DAYS,
            "status": STATUS_TODO,
            "created_at": three_days_ago,
            "updated_at": three_days_ago,
            "completed_at": None,
            "completion_count": 5,
        },
        {
            "id": "task_seed_002",
            "title": "Kitchen island sanitization & dishwasher cycle",
            "description": "Wipe quartz countertops and run evening sanitizing wash cycle.",
            "due_date": today_evening,
            "assigned_to": "Jill Cummings",
            "is_recurring": True,
            "recurrence_cadence": RECURRENCE_DAILY,
            "recurrence_interval": 1,
            "recurrence_unit": UNIT_DAYS,
            "status": STATUS_IN_PROGRESS,
            "created_at": yesterday,
            "updated_at": now.isoformat(),
            "completed_at": None,
            "completion_count": 12,
        },
        {
            "id": "task_seed_003",
            "title": "Check Botanical Bay reservoir EC/pH & water top-off",
            "description": "Inspect nutrient solution in grow room reservoir and calibrate probe if drift > 0.2.",
            "due_date": tomorrow,
            "assigned_to": "Jason Cummings",
            "is_recurring": True,
            "recurrence_cadence": RECURRENCE_WEEKLY,
            "recurrence_interval": 1,
            "recurrence_unit": UNIT_DAYS,
            "status": STATUS_TODO,
            "created_at": yesterday,
            "updated_at": yesterday,
            "completed_at": None,
            "completion_count": 8,
        },
        {
            "id": "task_seed_004",
            "title": "Luba mower blade inspection & deck clean",
            "description": "Clear grass buildup under cutting deck and inspect razor blades for nicking.",
            "due_date": three_days_later,
            "assigned_to": "Jason Cummings",
            "is_recurring": True,
            "recurrence_cadence": RECURRENCE_CUSTOM,
            "recurrence_interval": 3,
            "recurrence_unit": UNIT_DAYS,
            "status": STATUS_TODO,
            "created_at": yesterday,
            "updated_at": yesterday,
            "completed_at": None,
            "completion_count": 3,
        },
        {
            "id": "task_seed_005",
            "title": "Recycling & garbage bin curbside rollout",
            "description": "Roll blue recycling and green yard waste bins to curb for Thursday pickup.",
            "due_date": yesterday,
            "assigned_to": "Jason Cummings",
            "is_recurring": False,
            "recurrence_cadence": "none",
            "recurrence_interval": 1,
            "recurrence_unit": UNIT_DAYS,
            "status": STATUS_COMPLETE,
            "created_at": three_days_ago,
            "updated_at": yesterday,
            "completed_at": yesterday,
            "completion_count": 1,
        },
    ]


class TaskStore:
    """Manages persistent disk storage of household tasks."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the storage helper."""
        self._hass = hass
        self._store = Store(hass, STORAGE_VERSION, STORAGE_KEY)

    async def async_load(self) -> dict[str, Task]:
        """Load stored tasks from disk, seeding initial tasks if empty."""
        data = await self._store.async_load()
        tasks: dict[str, Task] = {}

        if not data or not isinstance(data, dict) or "tasks" not in data:
            _LOGGER.info("No existing task storage found; initializing with seed household tasks")
            seed_data = get_default_seed_tasks()
            for item in seed_data:
                task = Task.from_dict(item)
                tasks[task.id] = task
            await self.async_save(tasks)
            return tasks

        for item in data.get("tasks", []):
            try:
                task = Task.from_dict(item)
                tasks[task.id] = task
            except Exception as err:
                _LOGGER.error("Failed to parse task item from storage: %s, error: %s", item, err)

        return tasks

    async def async_save(self, tasks: dict[str, Task]) -> None:
        """Save tasks dictionary to Home Assistant storage."""
        payload = {
            "version": STORAGE_VERSION,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "tasks": [t.to_dict() for t in tasks.values()],
        }
        await self._store.async_save(payload)
