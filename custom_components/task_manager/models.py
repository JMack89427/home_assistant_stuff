"""Data model for Household Tasks and Chores."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import uuid
from typing import Any

from .const import (
    COLOR_COMPLETE,
    COLOR_IN_PROGRESS,
    COLOR_OVERDUE,
    COLOR_TODO,
    RECURRENCE_CADENCES,
    RECURRENCE_DAILY,
    RECURRENCE_NONE,
    RECURRENCE_UNITS,
    STATUS_CHOICES,
    STATUS_COLORS,
    STATUS_COMPLETE,
    STATUS_IN_PROGRESS,
    STATUS_LABELS,
    STATUS_OVERDUE,
    STATUS_TODO,
    UNIT_DAYS,
)
from .recurrence import calculate_next_due_date, parse_datetime


@dataclass
class Task:
    """Represents a single household task or recurring chore."""

    id: str
    title: str
    description: str = ""
    due_date: str | None = None
    assigned_to: str = ""
    is_recurring: bool = False
    recurrence_cadence: str = RECURRENCE_NONE
    recurrence_interval: int = 1
    recurrence_unit: str = UNIT_DAYS
    status: str = STATUS_TODO
    created_at: str = ""
    updated_at: str = ""
    completed_at: str | None = None
    completion_count: int = 0

    @classmethod
    def create(
        cls,
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
        """Create a new Task instance with initialized timestamps and defaults."""
        now_str = datetime.now(timezone.utc).isoformat()
        cadence = recurrence_cadence if recurrence_cadence in RECURRENCE_CADENCES else RECURRENCE_NONE
        if is_recurring and cadence == RECURRENCE_NONE:
            cadence = RECURRENCE_DAILY

        return cls(
            id=uuid.uuid4().hex[:12],
            title=title.strip(),
            description=description.strip(),
            due_date=due_date,
            assigned_to=assigned_to.strip(),
            is_recurring=bool(is_recurring),
            recurrence_cadence=cadence,
            recurrence_interval=max(1, int(recurrence_interval)),
            recurrence_unit=recurrence_unit if recurrence_unit in RECURRENCE_UNITS else UNIT_DAYS,
            status=status if status in STATUS_CHOICES else STATUS_TODO,
            created_at=now_str,
            updated_at=now_str,
            completed_at=None,
            completion_count=0,
        )

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Task:
        """Hydrate a Task from a dictionary representation."""
        return cls(
            id=str(data.get("id", uuid.uuid4().hex[:12])),
            title=str(data.get("title", "Untitled Task")),
            description=str(data.get("description", "")),
            due_date=data.get("due_date"),
            assigned_to=str(data.get("assigned_to", "")),
            is_recurring=bool(data.get("is_recurring", False)),
            recurrence_cadence=str(data.get("recurrence_cadence", RECURRENCE_NONE)),
            recurrence_interval=max(1, int(data.get("recurrence_interval", 1))),
            recurrence_unit=str(data.get("recurrence_unit", UNIT_DAYS)),
            status=str(data.get("status", STATUS_TODO)),
            created_at=str(data.get("created_at", "")),
            updated_at=str(data.get("updated_at", "")),
            completed_at=data.get("completed_at"),
            completion_count=int(data.get("completion_count", 0)),
        )

    def is_overdue(self) -> bool:
        """Check if task is past its due date without completion."""
        if self.status == STATUS_COMPLETE:
            return False
        if not self.due_date:
            return False
        parsed_due = parse_datetime(self.due_date)
        if not parsed_due:
            return False

        now = datetime.now(timezone.utc)
        if parsed_due.tzinfo is None:
            # Naive datetime comparison using local/system time
            now_naive = datetime.now()
            return parsed_due < now_naive
        return parsed_due < now

    @property
    def effective_status(self) -> str:
        """
        Return the dynamically evaluated status.
        
        Strict 4-state lifecycle:
        - Brown: To Do
        - Blue: In Progress
        - Green: Complete
        - Red: Overdue
        """
        if self.status == STATUS_COMPLETE:
            return STATUS_COMPLETE
        if self.is_overdue():
            return STATUS_OVERDUE
        return self.status

    @property
    def status_color(self) -> str:
        """Return the hex color matching the status specification."""
        return STATUS_COLORS.get(self.effective_status, COLOR_TODO)

    @property
    def status_label(self) -> str:
        """Return human-readable status label."""
        return STATUS_LABELS.get(self.effective_status, "To Do")

    def mark_complete(self) -> bool:
        """
        Mark task complete.
        
        If recurring, automatically reschedules next occurrence and resets status to To Do.
        Returns True if task was recurring and rescheduled, False if completed as one-off.
        """
        now_utc = datetime.now(timezone.utc)
        now_str = now_utc.isoformat()
        self.completed_at = now_str
        self.completion_count += 1
        self.updated_at = now_str

        if self.is_recurring and self.recurrence_cadence != RECURRENCE_NONE:
            next_due = calculate_next_due_date(
                current_due=self.due_date,
                cadence=self.recurrence_cadence,
                interval=self.recurrence_interval,
                unit=self.recurrence_unit,
                completed_at=now_utc,
            )
            self.due_date = next_due
            self.status = STATUS_TODO
            return True

        self.status = STATUS_COMPLETE
        return False

    def update(
        self,
        title: str | None = None,
        description: str | None = None,
        due_date: str | None = None,
        assigned_to: str | None = None,
        is_recurring: bool | None = None,
        recurrence_cadence: str | None = None,
        recurrence_interval: int | None = None,
        recurrence_unit: str | None = None,
        status: str | None = None,
    ) -> None:
        """Update task fields and touch updated_at."""
        if title is not None:
            self.title = title.strip()
        if description is not None:
            self.description = description.strip()
        if due_date is not None:
            self.due_date = due_date or None
        if assigned_to is not None:
            self.assigned_to = assigned_to.strip()
        if is_recurring is not None:
            self.is_recurring = bool(is_recurring)
        if recurrence_cadence is not None:
            self.recurrence_cadence = recurrence_cadence
        if recurrence_interval is not None:
            self.recurrence_interval = max(1, int(recurrence_interval))
        if recurrence_unit is not None:
            self.recurrence_unit = recurrence_unit
        if status is not None and status in STATUS_CHOICES:
            self.status = status
            if status != STATUS_COMPLETE:
                self.completed_at = None

        self.updated_at = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict[str, Any]:
        """Convert task to JSON-serializable dictionary with computed attributes."""
        res = asdict(self)
        res["effective_status"] = self.effective_status
        res["status_color"] = self.status_color
        res["status_label"] = self.status_label
        res["is_overdue"] = self.is_overdue()
        return res
