"""Recurrence engine for chore and task scheduling."""
from __future__ import annotations

import calendar
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from .const import (
    RECURRENCE_CUSTOM,
    RECURRENCE_DAILY,
    RECURRENCE_MONTHLY,
    RECURRENCE_NONE,
    RECURRENCE_WEEKLY,
    UNIT_DAYS,
    UNIT_MONTHS,
    UNIT_WEEKS,
)


def parse_datetime(val: Any) -> datetime | None:
    """Parse an ISO 8601 string or date/datetime into an aware or naive datetime."""
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, date):
        return datetime.combine(val, time(23, 59, 59))
    if isinstance(val, str):
        # Handle trailing Z or offsets
        val_clean = val.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(val_clean)
        except ValueError:
            # Try date-only format
            try:
                parsed_d = date.fromisoformat(val[:10])
                return datetime.combine(parsed_d, time(23, 59, 59))
            except ValueError:
                return None
    return None


def add_months(source_date: datetime, months: int) -> datetime:
    """Add a specified number of months to a datetime, clamping to valid month days."""
    year = source_date.year + (source_date.month + months - 1) // 12
    month = (source_date.month + months - 1) % 12 + 1
    max_days = calendar.monthrange(year, month)[1]
    day = min(source_date.day, max_days)
    return source_date.replace(year=year, month=month, day=day)


def step_date(base: datetime, cadence: str, interval: int = 1, unit: str = UNIT_DAYS) -> datetime:
    """Step a date forward by one recurrence increment."""
    step_interval = max(1, interval)
    if cadence == RECURRENCE_DAILY:
        return base + timedelta(days=step_interval)
    if cadence == RECURRENCE_WEEKLY:
        return base + timedelta(weeks=step_interval)
    if cadence == RECURRENCE_MONTHLY:
        return add_months(base, step_interval)
    if cadence == RECURRENCE_CUSTOM:
        if unit == UNIT_WEEKS:
            return base + timedelta(weeks=step_interval)
        if unit == UNIT_MONTHS:
            return add_months(base, step_interval)
        # default to days
        return base + timedelta(days=step_interval)
    return base + timedelta(days=1)


def calculate_next_due_date(
    current_due: datetime | str | None,
    cadence: str,
    interval: int = 1,
    unit: str = UNIT_DAYS,
    completed_at: datetime | str | None = None,
) -> str:
    """
    Calculate the next due date timestamp in ISO 8601 format.
    
    If the recurring task was overdue, steps forward until the new due date
    is in the future, preserving the cadence alignment (e.g. weekly anchor day).
    """
    parsed_due = parse_datetime(current_due)
    parsed_comp = parse_datetime(completed_at)
    
    now = datetime.now(timezone.utc)
    if parsed_due and parsed_due.tzinfo is not None:
        reference_time = parsed_comp or now
        if reference_time.tzinfo is None:
            reference_time = reference_time.replace(tzinfo=timezone.utc)
    else:
        reference_time = (parsed_comp or now).replace(tzinfo=None) if (parsed_comp or now) else datetime.now()
        if parsed_due and parsed_due.tzinfo is not None:
            parsed_due = parsed_due.astimezone(timezone.utc).replace(tzinfo=None)

    base = parsed_due or reference_time

    if cadence == RECURRENCE_NONE:
        return base.isoformat()

    # Calculate next occurrence
    candidate = step_date(base, cadence, interval, unit)
    
    # If the candidate is still in the past compared to reference time,
    # advance until it is in the future (max 500 iterations to avoid infinite loops)
    iterations = 0
    while candidate <= reference_time and iterations < 500:
        candidate = step_date(candidate, cadence, interval, unit)
        iterations += 1

    if candidate <= reference_time:
        # Fallback if iterations exhausted
        candidate = step_date(reference_time, cadence, interval, unit)

    return candidate.isoformat()
