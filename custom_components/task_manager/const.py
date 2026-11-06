"""Constants for the Household Task & Chore Manager integration."""

DOMAIN = "task_manager"
STORAGE_KEY = "task_manager_tasks"
STORAGE_VERSION = 1

# Status constants
STATUS_TODO = "todo"
STATUS_IN_PROGRESS = "in_progress"
STATUS_COMPLETE = "complete"
STATUS_OVERDUE = "overdue"

STATUS_CHOICES = [
    STATUS_TODO,
    STATUS_IN_PROGRESS,
    STATUS_COMPLETE,
    STATUS_OVERDUE,
]

# Strict color specification:
# Brown: To Do
# Blue: In Progress
# Green: Complete
# Red: Overdue
COLOR_TODO = "#8D6E63"         # Warm earthy brown
COLOR_IN_PROGRESS = "#1976D2" # Vibrant blue
COLOR_COMPLETE = "#2E7D32"    # Forest green
COLOR_OVERDUE = "#C62828"     # Crimson red

STATUS_COLORS = {
    STATUS_TODO: COLOR_TODO,
    STATUS_IN_PROGRESS: COLOR_IN_PROGRESS,
    STATUS_COMPLETE: COLOR_COMPLETE,
    STATUS_OVERDUE: COLOR_OVERDUE,
}

STATUS_LABELS = {
    STATUS_TODO: "To Do",
    STATUS_IN_PROGRESS: "In Progress",
    STATUS_COMPLETE: "Complete",
    STATUS_OVERDUE: "Overdue",
}

# Recurrence cadences
RECURRENCE_NONE = "none"
RECURRENCE_DAILY = "daily"
RECURRENCE_WEEKLY = "weekly"
RECURRENCE_MONTHLY = "monthly"
RECURRENCE_CUSTOM = "custom"

RECURRENCE_CADENCES = [
    RECURRENCE_NONE,
    RECURRENCE_DAILY,
    RECURRENCE_WEEKLY,
    RECURRENCE_MONTHLY,
    RECURRENCE_CUSTOM,
]

# Recurrence interval units
UNIT_DAYS = "days"
UNIT_WEEKS = "weeks"
UNIT_MONTHS = "months"

RECURRENCE_UNITS = [
    UNIT_DAYS,
    UNIT_WEEKS,
    UNIT_MONTHS,
]

# Services
SERVICE_CREATE_TASK = "create_task"
SERVICE_UPDATE_TASK = "update_task"
SERVICE_ASSIGN_TASK = "assign_task"
SERVICE_COMPLETE_TASK = "complete_task"
SERVICE_SET_STATUS = "set_status"
SERVICE_DELETE_TASK = "delete_task"

# Signals
SIGNAL_TASK_MANAGER_UPDATED = "task_manager_tasks_updated"
