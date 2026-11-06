"""Task and Chore business logic manager."""
from __future__ import annotations

import logging
from typing import Any, Callable

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import (
    DOMAIN,
    RECURRENCE_NONE,
    SIGNAL_TASK_MANAGER_UPDATED,
    STATUS_CHOICES,
    STATUS_COMPLETE,
    STATUS_IN_PROGRESS,
    STATUS_OVERDUE,
    STATUS_TODO,
    UNIT_DAYS,
)
from .models import Task
from .store import TaskStore

_LOGGER = logging.getLogger(__name__)


class TaskManager:
    """Manages chore and task lifecycle, persistence, and event dispatching."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the task manager."""
        self.hass = hass
        self._store = TaskStore(hass)
        self._tasks: dict[str, Task] = {}
        self._listeners: list[Callable[[], None]] = []

    async def async_load(self) -> None:
        """Load tasks from persistent storage."""
        self._tasks = await self._store.async_load()
        _LOGGER.info("Loaded %d household tasks from persistent storage", len(self._tasks))

    @callback
    def register_listener(self, listener: Callable[[], None]) -> Callable[[], None]:
        """Register a callback for state changes."""
        self._listeners.append(listener)

        def remove_listener() -> None:
            if listener in self._listeners:
                self._listeners.remove(listener)

        return remove_listener

    def _notify_listeners(self) -> None:
        """Notify registered listeners and dispatch update signal."""
        for listener in list(self._listeners):
            try:
                listener()
            except Exception as err:
                _LOGGER.error("Error executing task manager listener: %s", err)

        async_dispatcher_send(self.hass, SIGNAL_TASK_MANAGER_UPDATED)

    def get_task(self, task_id: str) -> Task | None:
        """Get a task instance by ID."""
        return self._tasks.get(task_id)

    def get_tasks(self) -> list[dict[str, Any]]:
        """Return list of all tasks as dictionaries with dynamic statuses."""
        return [t.to_dict() for t in self._tasks.values()]

    def get_summary(self) -> dict[str, Any]:
        """Calculate summary counts and metrics."""
        tasks_list = self.get_tasks()
        todo_count = 0
        in_progress_count = 0
        overdue_count = 0
        complete_count = 0
        assignees: set[str] = set()

        for t in tasks_list:
            eff_status = t.get("effective_status")
            if eff_status == STATUS_OVERDUE:
                overdue_count += 1
            elif eff_status == STATUS_IN_PROGRESS:
                in_progress_count += 1
            elif eff_status == STATUS_COMPLETE:
                complete_count += 1
            else:
                todo_count += 1

            assignee = t.get("assigned_to")
            if assignee:
                assignees.add(assignee)

        return {
            "total_tasks": len(tasks_list),
            "active_tasks": overdue_count + in_progress_count + todo_count,
            "todo_count": todo_count,
            "in_progress_count": in_progress_count,
            "overdue_count": overdue_count,
            "complete_count": complete_count,
            "assignees": sorted(list(assignees)),
        }

    async def async_create_task(
        self,
        title: str,
        description: str = "",
        due_date: str | None = None,
        assigned_to: str = "",
        is_recurring: bool = False,
        recurrence_cadence: str = RECURRENCE_NONE,
        recurrence_interval: int = 1,
        recurrence_unit: str = UNIT_DAYS,
        status: str = STATUS_TODO,
    ) -> Task:
        """Create and persist a new task."""
        task = Task.create(
            title=title,
            description=description,
            due_date=due_date,
            assigned_to=assigned_to,
            is_recurring=is_recurring,
            recurrence_cadence=recurrence_cadence,
            recurrence_interval=recurrence_interval,
            recurrence_unit=recurrence_unit,
            status=status,
        )
        self._tasks[task.id] = task
        await self._store.async_save(self._tasks)
        self._notify_listeners()
        _LOGGER.info("Created task '%s' (ID: %s)", task.title, task.id)
        return task

    async def async_update_task(
        self,
        task_id: str,
        title: str | None = None,
        description: str | None = None,
        due_date: str | None = None,
        assigned_to: str | None = None,
        is_recurring: bool | None = None,
        recurrence_cadence: str | None = None,
        recurrence_interval: int | None = None,
        recurrence_unit: str | None = None,
        status: str | None = None,
    ) -> Task:
        """Update an existing task."""
        task = self._tasks.get(task_id)
        if not task:
            raise ValueError(f"Task with ID {task_id} not found")

        task.update(
            title=title,
            description=description,
            due_date=due_date,
            assigned_to=assigned_to,
            is_recurring=is_recurring,
            recurrence_cadence=recurrence_cadence,
            recurrence_interval=recurrence_interval,
            recurrence_unit=recurrence_unit,
            status=status,
        )
        await self._store.async_save(self._tasks)
        self._notify_listeners()
        _LOGGER.info("Updated task '%s' (ID: %s)", task.title, task.id)
        return task

    async def async_assign_task(self, task_id: str, assigned_to: str) -> Task:
        """Assign task to a household user."""
        return await self.async_update_task(task_id, assigned_to=assigned_to)

    async def async_set_status(self, task_id: str, status: str) -> Task:
        """Directly update status of a task."""
        if status not in STATUS_CHOICES:
            raise ValueError(f"Invalid status '{status}'. Must be one of {STATUS_CHOICES}")
        return await self.async_update_task(task_id, status=status)

    async def async_complete_task(self, task_id: str) -> tuple[Task, bool]:
        """
        Mark task complete with automatic recurrence handling.
        
        Returns tuple of (Task, was_rescheduled).
        """
        task = self._tasks.get(task_id)
        if not task:
            raise ValueError(f"Task with ID {task_id} not found")

        was_rescheduled = task.mark_complete()
        await self._store.async_save(self._tasks)
        self._notify_listeners()
        if was_rescheduled:
            _LOGGER.info(
                "Completed recurring task '%s'; automatically rescheduled to %s",
                task.title,
                task.due_date,
            )
        else:
            _LOGGER.info("Completed one-off task '%s'", task.title)
        return task, was_rescheduled

    async def async_delete_task(self, task_id: str) -> bool:
        """Delete task from store."""
        if task_id in self._tasks:
            removed = self._tasks.pop(task_id)
            await self._store.async_save(self._tasks)
            self._notify_listeners()
            _LOGGER.info("Deleted task '%s' (ID: %s)", removed.title, task_id)
            return True
        return False
