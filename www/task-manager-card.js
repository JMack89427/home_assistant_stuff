/**
 * Household Task & Chore Manager Card for Home Assistant Lovelace
 * Features:
 * - Strict Color Coding & Prominent Visual Legend:
 *     Brown: To Do (#8D6E63)
 *     Blue: In Progress (#1976D2)
 *     Green: Complete (#2E7D32)
 *     Red: Overdue (#C62828)
 * - Assignee Filtering (All, Jason Cummings, Jill Cummings, Unassigned, etc.)
 * - Status Filtering (All, To Do, In Progress, Overdue, Complete)
 * - Recurrence Engine Visual Badges (Daily, Weekly, Monthly, Custom)
 * - Quick-Action Status Toggles (Complete & Reschedule, Start In-Progress, Reset to To-Do, Delete)
 * - Embedded "New Task" & "Edit Task" Modal Drawer
 * - Dual backend connectivity: WebSocket real-time subscription + Service Call fallback
 */

(function () {
  'use strict';

  const CARD_VERSION = '1.0.0';

  const STATUS_CONFIG = {
    todo: {
      key: 'todo',
      label: 'To Do',
      color: '#8D6E63',
      bg: 'rgba(141, 110, 99, 0.15)',
      border: '#8D6E63',
      icon: 'mdi:checkbox-blank-circle-outline',
    },
    in_progress: {
      key: 'in_progress',
      label: 'In Progress',
      color: '#1976D2',
      bg: 'rgba(25, 118, 210, 0.16)',
      border: '#1976D2',
      icon: 'mdi:progress-clock',
    },
    complete: {
      key: 'complete',
      label: 'Complete',
      color: '#2E7D32',
      bg: 'rgba(46, 125, 50, 0.16)',
      border: '#2E7D32',
      icon: 'mdi:check-circle',
    },
    overdue: {
      key: 'overdue',
      label: 'Overdue',
      color: '#C62828',
      bg: 'rgba(198, 40, 40, 0.18)',
      border: '#C62828',
      icon: 'mdi:alert-circle',
    },
  };

  const ICONS = {
    todo: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4Z"/></svg>`,
    in_progress: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/></svg>`,
    complete: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>`,
    overdue: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>`,
    repeat: `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M17,17H7V14L3,18L7,22V19H19V13H17M7,7H17V10L21,6L17,2V5H5V11H7V7Z"/></svg>`,
    account: `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>`,
    close: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>`,
    delete: `<svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>`,
    play: `<svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z"/></svg>`,
    undo: `<svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z"/></svg>`,
    check: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>`,
  };

  function formatRelativeDate(isoStr) {
    if (!isoStr) return 'No due date';
    const due = new Date(isoStr);
    if (isNaN(due.getTime())) return isoStr;

    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const timeStr = due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const dateStr = due.toLocaleDateString([], { month: 'short', day: 'numeric' });

    if (diffMs < 0) {
      const absDays = Math.abs(diffDays);
      if (absDays === 0) {
        const absHours = Math.max(1, Math.round(Math.abs(diffSec) / 3600));
        return `Overdue by ${absHours}h`;
      }
      return `Overdue by ${absDays}d (${dateStr})`;
    }

    if (diffDays === 0) {
      return `Today at ${timeStr}`;
    } else if (diffDays === 1) {
      return `Tomorrow at ${timeStr}`;
    } else if (diffDays < 7) {
      const weekday = due.toLocaleDateString([], { weekday: 'short' });
      return `${weekday} at ${timeStr}`;
    }
    return `${dateStr} (${timeStr})`;
  }

  function getCadenceLabel(task) {
    if (!task.is_recurring || task.recurrence_cadence === 'none') {
      return 'One-off';
    }
    const c = task.recurrence_cadence || 'daily';
    if (c === 'daily') return 'Daily';
    if (c === 'weekly') return 'Weekly';
    if (c === 'monthly') return 'Monthly';
    if (c === 'custom') {
      const interval = task.recurrence_interval || 1;
      const unit = task.recurrence_unit || 'days';
      return `Every ${interval} ${unit}`;
    }
    return c;
  }

  class TaskManagerCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._tasks = [];
      this._summary = null;
      this._filterAssignee = 'ALL';
      this._filterStatus = 'ALL';
      this._searchQuery = '';
      this._showDrawer = false;
      this._editingTaskId = null;
      this._unsubWs = null;
    }

    setConfig(config) {
      this._config = {
        title: config.title || 'HOUSEHOLD TASK & CHORE MANAGER',
        show_legend: config.show_legend !== false,
        show_assignee_filter: config.show_assignee_filter !== false,
        show_add_button: config.show_add_button !== false,
        default_assignee: config.default_assignee || 'ALL',
        ...config,
      };
      if (this._filterAssignee === 'ALL' && this._config.default_assignee !== 'ALL') {
        this._filterAssignee = this._config.default_assignee;
      }
      this._render();
    }

    set hass(hass) {
      const oldHass = this._hass;
      this._hass = hass;

      if (!oldHass) {
        this._initData();
      } else {
        // Check if summary sensor updated
        const oldState = oldHass.states['sensor.task_manager_summary'];
        const newState = hass.states['sensor.task_manager_summary'];
        if (newState && (!oldState || oldState.last_updated !== newState.last_updated)) {
          this._loadFromSensor(newState);
        }
      }
    }

    connectedCallback() {
      if (this._hass && !this._unsubWs) {
        this._initData();
      }
    }

    disconnectedCallback() {
      if (typeof this._unsubWs === 'function') {
        this._unsubWs();
        this._unsubWs = null;
      }
    }

    async _initData() {
      if (!this._hass) return;

      // First try to read immediate state from sensor
      const sensorState = this._hass.states['sensor.task_manager_summary'];
      if (sensorState) {
        this._loadFromSensor(sensorState);
      }

      // Try subscribing to WebSocket
      try {
        if (this._hass.connection && typeof this._hass.connection.subscribeMessage === 'function') {
          this._unsubWs = await this._hass.connection.subscribeMessage(
            (msg) => {
              if (msg && msg.tasks) {
                this._tasks = msg.tasks;
                this._summary = msg.summary;
                this._render();
              }
            },
            { type: 'task_manager/subscribe' }
          );
        }
      } catch (e) {
        // Fallback: poll or fetch via ws call
        try {
          const res = await this._hass.callWS({ type: 'task_manager/tasks' });
          if (res && res.tasks) {
            this._tasks = res.tasks;
            this._summary = res.summary;
            this._render();
          }
        } catch (err) {
          console.debug('TaskManagerCard WS fallback to sensor:', err);
        }
      }
    }

    _loadFromSensor(sensorState) {
      if (sensorState && sensorState.attributes && Array.isArray(sensorState.attributes.tasks)) {
        this._tasks = sensorState.attributes.tasks;
        this._summary = {
          total_tasks: sensorState.attributes.total_tasks || this._tasks.length,
          active_tasks: sensorState.attributes.active_tasks || 0,
          todo_count: sensorState.attributes.todo_count || 0,
          in_progress_count: sensorState.attributes.in_progress_count || 0,
          overdue_count: sensorState.attributes.overdue_count || 0,
          complete_count: sensorState.attributes.complete_count || 0,
          assignees: sensorState.attributes.assignees || [],
        };
        this._render();
      }
    }

    _getEffectiveStatus(task) {
      if (task.effective_status) return task.effective_status;
      if (task.status === 'complete') return 'complete';
      if (task.due_date) {
        const d = new Date(task.due_date);
        if (!isNaN(d.getTime()) && d < new Date()) {
          return 'overdue';
        }
      }
      return task.status || 'todo';
    }

    _getHouseholdPersons() {
      const persons = new Set(['Jason Cummings', 'Jill Cummings']);
      if (this._hass && this._hass.states) {
        Object.keys(this._hass.states).forEach((entityId) => {
          if (entityId.startsWith('person.')) {
            const p = this._hass.states[entityId];
            const name = p?.attributes?.friendly_name || p?.entity_id?.replace('person.', '');
            if (name) persons.add(name);
          }
        });
      }
      this._tasks.forEach((t) => {
        if (t.assigned_to) persons.add(t.assigned_to);
      });
      return Array.from(persons).sort();
    }

    // ── Actions ──────────────────────────────────────────────────────────────

    async _handleToggleComplete(task) {
      // Optimistic update
      const wasComplete = task.status === 'complete';
      const isRecurring = task.is_recurring && task.recurrence_cadence !== 'none';

      try {
        if (this._hass.connection) {
          await this._hass.callWS({
            type: 'task_manager/complete',
            task_id: task.id,
          });
        } else {
          await this._hass.callService('task_manager', 'complete_task', { task_id: task.id });
        }
      } catch (err) {
        // Fallback to service call
        try {
          await this._hass.callService('task_manager', 'complete_task', { task_id: task.id });
        } catch (e2) {
          console.error('Failed to complete task:', e2);
        }
      }
    }

    async _handleToggleInProgress(task) {
      const currentEff = this._getEffectiveStatus(task);
      const newStatus = currentEff === 'in_progress' ? 'todo' : 'in_progress';
      try {
        await this._hass.callService('task_manager', 'set_status', {
          task_id: task.id,
          status: newStatus,
        });
      } catch (err) {
        console.error('Failed to update status:', err);
      }
    }

    async _handleResetToTodo(task) {
      try {
        await this._hass.callService('task_manager', 'set_status', {
          task_id: task.id,
          status: 'todo',
        });
      } catch (err) {
        console.error('Failed to reset status:', err);
      }
    }

    async _handleDeleteTask(task) {
      if (!confirm(`Delete task "${task.title}"?`)) return;
      try {
        await this._hass.callService('task_manager', 'delete_task', {
          task_id: task.id,
        });
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }

    _handleOpenNewTask() {
      this._editingTaskId = null;
      this._showDrawer = true;
      this._render();
    }

    _handleOpenEditTask(task) {
      this._editingTaskId = task.id;
      this._showDrawer = true;
      this._render();
    }

    _handleCloseDrawer() {
      this._showDrawer = false;
      this._editingTaskId = null;
      this._render();
    }

    async _handleSaveForm(e) {
      e.preventDefault();
      const form = this.shadowRoot.querySelector('#task-form');
      if (!form) return;

      const title = form.title.value.trim();
      if (!title) return;

      const description = form.description.value.trim();
      const dueVal = form.due_date.value;
      const due_date = dueVal ? new Date(dueVal).toISOString() : null;
      const assigned_to = form.assigned_to.value;
      const is_recurring = form.is_recurring.checked;
      const recurrence_cadence = form.recurrence_cadence.value;
      const recurrence_interval = parseInt(form.recurrence_interval?.value || '1', 10);
      const recurrence_unit = form.recurrence_unit?.value || 'days';
      const status = form.status?.value || 'todo';

      try {
        if (this._editingTaskId) {
          await this._hass.callService('task_manager', 'update_task', {
            task_id: this._editingTaskId,
            title,
            description,
            due_date,
            assigned_to,
            is_recurring,
            recurrence_cadence,
            recurrence_interval,
            recurrence_unit,
            status,
          });
        } else {
          await this._hass.callService('task_manager', 'create_task', {
            title,
            description,
            due_date,
            assigned_to,
            is_recurring,
            recurrence_cadence,
            recurrence_interval,
            recurrence_unit,
            status,
          });
        }
        this._showDrawer = false;
        this._editingTaskId = null;
        this._render();
      } catch (err) {
        alert('Failed to save task: ' + (err.message || err));
      }
    }

    _render() {
      if (!this._config) return;

      // Compute status counts
      let countTodo = 0, countInProgress = 0, countOverdue = 0, countComplete = 0;
      const assigneesSet = new Set();

      this._tasks.forEach((t) => {
        const eff = this._getEffectiveStatus(t);
        if (eff === 'overdue') countOverdue++;
        else if (eff === 'in_progress') countInProgress++;
        else if (eff === 'complete') countComplete++;
        else countTodo++;

        if (t.assigned_to) assigneesSet.add(t.assigned_to);
      });

      // Filter tasks
      let filtered = this._tasks.filter((t) => {
        const eff = this._getEffectiveStatus(t);

        // Status filter
        if (this._filterStatus !== 'ALL') {
          if (eff !== this._filterStatus) return false;
        }

        // Assignee filter
        if (this._filterAssignee !== 'ALL') {
          if (this._filterAssignee === 'UNASSIGNED') {
            if (t.assigned_to) return false;
          } else if (t.assigned_to !== this._filterAssignee) {
            return false;
          }
        }

        // Search text
        if (this._searchQuery) {
          const q = this._searchQuery.toLowerCase();
          const matchTitle = (t.title || '').toLowerCase().includes(q);
          const matchDesc = (t.description || '').toLowerCase().includes(q);
          const matchAssigned = (t.assigned_to || '').toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchAssigned) return false;
        }

        return true;
      });

      // Urgency sorting: Overdue first, then In Progress, then To Do, then Complete; within each group sort by due_date
      const statusWeight = { overdue: 0, in_progress: 1, todo: 2, complete: 3 };
      filtered.sort((a, b) => {
        const sa = statusWeight[this._getEffectiveStatus(a)] ?? 2;
        const sb = statusWeight[this._getEffectiveStatus(b)] ?? 2;
        if (sa !== sb) return sa - sb;
        const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return da - db;
      });

      const householdPersons = this._getHouseholdPersons();
      const editingTask = this._editingTaskId ? this._tasks.find((t) => t.id === this._editingTaskId) : null;

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            --primary-bg: var(--ha-card-background, var(--card-background-color, #1a1c1e));
            --card-border-color: var(--ha-card-border-color, rgba(255, 255, 255, 0.08));
            --text-primary: var(--primary-text-color, #f0f0f0);
            --text-secondary: var(--secondary-text-color, #9e9e9e);
            --font-family: var(--paper-font-body1_-_font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
            
            /* Status schema tokens */
            --color-todo: #8D6E63;        /* Brown */
            --color-in-progress: #1976D2; /* Blue */
            --color-complete: #2E7D32;    /* Green */
            --color-overdue: #C62828;     /* Red */
          }

          * {
            box-sizing: border-box;
          }

          .container {
            background: var(--primary-bg);
            border-radius: var(--ha-card-border-radius, 16px);
            border: 1px solid var(--card-border-color);
            padding: 20px;
            box-shadow: var(--ha-card-box-shadow, 0 4px 20px rgba(0,0,0,0.25));
            font-family: var(--font-family);
            color: var(--text-primary);
            position: relative;
            overflow: hidden;
          }

          /* Header */
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }

          .title-row {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .title {
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: var(--text-primary);
          }

          .active-badge {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-primary);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
          }

          .btn-add {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, #1976D2, #1565C0);
            color: #fff;
            border: none;
            padding: 7px 14px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
          }
          .btn-add:hover {
            filter: brightness(1.15);
            transform: translateY(-1px);
          }

          /* Visual Status Legend */
          .legend-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 16px;
            padding: 10px 12px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }

          .legend-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            margin-right: 4px;
          }

          .legend-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            border: 1.5px solid transparent;
            background: rgba(255, 255, 255, 0.04);
            color: var(--text-primary);
            transition: all 0.2s;
            user-select: none;
          }
          .legend-pill:hover {
            filter: brightness(1.2);
            transform: translateY(-1px);
          }
          .legend-pill.active {
            box-shadow: 0 0 10px rgba(0,0,0,0.4);
          }

          .legend-pill.all.active {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
          }
          .legend-pill.todo { color: #D7CCC8; }
          .legend-pill.todo.active { background: rgba(141, 110, 99, 0.35); border-color: var(--color-todo); }
          .legend-pill.in_progress { color: #90CAF9; }
          .legend-pill.in_progress.active { background: rgba(25, 118, 210, 0.35); border-color: var(--color-in-progress); }
          .legend-pill.overdue { color: #EF9A9A; }
          .legend-pill.overdue.active { background: rgba(198, 40, 40, 0.35); border-color: var(--color-overdue); }
          .legend-pill.complete { color: #A5D6A7; }
          .legend-pill.complete.active { background: rgba(46, 125, 50, 0.35); border-color: var(--color-complete); }

          .dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            display: inline-block;
          }
          .dot.todo { background: var(--color-todo); box-shadow: 0 0 6px var(--color-todo); }
          .dot.in_progress { background: var(--color-in-progress); box-shadow: 0 0 6px var(--color-in-progress); }
          .dot.overdue { background: var(--color-overdue); box-shadow: 0 0 6px var(--color-overdue); }
          .dot.complete { background: var(--color-complete); box-shadow: 0 0 6px var(--color-complete); }

          .pill-count {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            padding: 1px 6px;
            font-size: 11px;
          }

          /* Filter Tabs / Assignee Bar */
          .filter-bar {
            display: flex;
            align-items: center;
            gap: 6px;
            overflow-x: auto;
            padding-bottom: 8px;
            margin-bottom: 14px;
            scrollbar-width: thin;
          }

          .chip {
            padding: 4px 11px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 500;
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-secondary);
            border: 1px solid rgba(255, 255, 255, 0.06);
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
            user-select: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
          .chip:hover {
            color: var(--text-primary);
            background: rgba(255, 255, 255, 0.09);
          }
          .chip.active {
            color: #fff;
            background: rgba(25, 118, 210, 0.25);
            border-color: #1976D2;
            font-weight: 600;
          }

          /* Task List */
          .task-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .empty-state {
            text-align: center;
            padding: 36px 16px;
            color: var(--text-secondary);
            font-size: 14px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 12px;
            border: 1px dashed rgba(255, 255, 255, 0.1);
          }

          /* Task Item Card */
          .task-card {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 10px;
            border-left: 5px solid #8D6E63;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            border-right: 1px solid rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            padding: 12px 14px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            transition: transform 0.15s, background 0.15s;
            position: relative;
          }
          .task-card:hover {
            background: rgba(255, 255, 255, 0.06);
            transform: translateX(2px);
          }

          /* Status borders & highlights */
          .task-card.todo {
            border-left-color: var(--color-todo);
          }
          .task-card.in_progress {
            border-left-color: var(--color-in-progress);
            background: rgba(25, 118, 210, 0.04);
          }
          .task-card.overdue {
            border-left-color: var(--color-overdue);
            background: rgba(198, 40, 40, 0.05);
          }
          .task-card.complete {
            border-left-color: var(--color-complete);
            opacity: 0.72;
          }
          .task-card.complete .task-title {
            text-decoration: line-through;
            color: var(--text-secondary);
          }

          /* Action check button */
          .action-btn-check {
            width: 24px;
            height: 24px;
            border-radius: 6px;
            border: 2px solid var(--text-secondary);
            background: transparent;
            color: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            flex-shrink: 0;
            margin-top: 2px;
            transition: all 0.2s;
          }
          .action-btn-check:hover {
            border-color: var(--color-complete);
            color: var(--color-complete);
            background: rgba(46, 125, 50, 0.1);
          }
          .task-card.complete .action-btn-check {
            background: var(--color-complete);
            border-color: var(--color-complete);
            color: #fff;
          }

          /* Task Content */
          .task-content {
            flex: 1;
            min-width: 0;
          }

          .task-header-line {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 4px;
          }

          .task-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            word-break: break-word;
          }

          /* Status badge */
          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 7px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .status-badge.todo {
            background: rgba(141, 110, 99, 0.2);
            color: #BCAAA4;
            border: 1px solid rgba(141, 110, 99, 0.4);
          }
          .status-badge.in_progress {
            background: rgba(25, 118, 210, 0.2);
            color: #90CAF9;
            border: 1px solid rgba(25, 118, 210, 0.4);
          }
          .status-badge.overdue {
            background: rgba(198, 40, 40, 0.25);
            color: #FFCDD2;
            border: 1px solid rgba(198, 40, 40, 0.5);
            animation: pulse-overdue 2s infinite ease-in-out;
          }
          .status-badge.complete {
            background: rgba(46, 125, 50, 0.2);
            color: #C8E6C9;
            border: 1px solid rgba(46, 125, 50, 0.4);
          }

          @keyframes pulse-overdue {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }

          .task-desc {
            font-size: 12px;
            color: var(--text-secondary);
            margin-bottom: 6px;
            line-height: 1.4;
            white-space: pre-wrap;
          }

          /* Metadata Tags */
          .task-meta {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
            font-size: 11px;
            color: var(--text-secondary);
            margin-top: 4px;
          }

          .meta-item {
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }

          .meta-item.due-date.overdue {
            color: #EF5350;
            font-weight: 600;
          }
          .meta-item.due-date.today {
            color: #FFB74D;
            font-weight: 600;
          }

          .meta-tag {
            background: rgba(255, 255, 255, 0.05);
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }

          /* Quick Actions menu */
          .task-actions {
            display: flex;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
            opacity: 0.85;
            transition: opacity 0.2s;
          }
          .task-card:hover .task-actions {
            opacity: 1;
          }

          .btn-icon {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            width: 28px;
            height: 28px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;
            padding: 0;
          }
          .btn-icon:hover {
            color: var(--text-primary);
            background: rgba(255, 255, 255, 0.1);
          }
          .btn-icon.play:hover {
            color: #42A5F5;
            background: rgba(25, 118, 210, 0.2);
          }
          .btn-icon.undo:hover {
            color: #BCAAA4;
            background: rgba(141, 110, 99, 0.2);
          }
          .btn-icon.del:hover {
            color: #EF5350;
            background: rgba(198, 40, 40, 0.2);
          }

          /* Modal Drawer for Create / Edit */
          .drawer-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            display: flex;
            justify-content: flex-end;
            z-index: 100;
            animation: fadeIn 0.2s ease-out;
          }

          .drawer {
            width: 100%;
            max-width: 420px;
            background: var(--primary-bg);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            padding: 20px;
            box-shadow: -6px 0 24px rgba(0,0,0,0.5);
            animation: slideIn 0.25s ease-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }

          .drawer-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }

          .drawer-title {
            font-size: 16px;
            font-weight: 700;
            color: var(--text-primary);
          }

          .form-group {
            margin-bottom: 16px;
          }

          .form-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .form-input, .form-textarea, .form-select {
            width: 100%;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: var(--text-primary);
            border-radius: 8px;
            padding: 9px 12px;
            font-size: 13px;
            font-family: inherit;
            outline: none;
            transition: border-color 0.2s;
          }
          .form-input:focus, .form-textarea:focus, .form-select:focus {
            border-color: #1976D2;
            background: rgba(255, 255, 255, 0.09);
          }

          .form-textarea {
            resize: vertical;
            min-height: 60px;
          }

          .toggle-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(255, 255, 255, 0.04);
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            margin-bottom: 12px;
          }

          .toggle-info {
            display: flex;
            flex-direction: column;
          }
          .toggle-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-primary);
          }
          .toggle-subtitle {
            font-size: 11px;
            color: var(--text-secondary);
          }

          .custom-switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
          }
          .custom-switch input {
            opacity: 0;
            width: 0;
            height: 0;
          }
          .slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 24px;
            transition: .3s;
          }
          .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            border-radius: 50%;
            transition: .3s;
          }
          input:checked + .slider {
            background-color: #1976D2;
          }
          input:checked + .slider:before {
            transform: translateX(20px);
          }

          .recurrence-fields {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 16px;
            border: 1px solid rgba(255, 255, 255, 0.06);
          }

          .form-actions {
            margin-top: auto;
            display: flex;
            gap: 10px;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
          }

          .btn-primary {
            flex: 1;
            background: #1976D2;
            color: #fff;
            border: none;
            padding: 10px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            transition: filter 0.2s;
          }
          .btn-primary:hover {
            filter: brightness(1.15);
          }

          .btn-cancel {
            background: rgba(255, 255, 255, 0.08);
            color: var(--text-primary);
            border: none;
            padding: 10px 16px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
          }
          .btn-cancel:hover {
            background: rgba(255, 255, 255, 0.12);
          }
        </style>

        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="title-row">
              <span class="title">${this._config.title}</span>
              <span class="active-badge">${countTodo + countInProgress + countOverdue} Active</span>
            </div>
            ${
              this._config.show_add_button
                ? `<button class="btn-add" id="btn-add-task">
                     ${ICONS.plus} <span>New Task</span>
                   </button>`
                : ''
            }
          </div>

          <!-- Status Legend Bar -->
          ${
            this._config.show_legend
              ? `
            <div class="legend-bar">
              <span class="legend-label">Status:</span>
              <div class="legend-pill all ${this._filterStatus === 'ALL' ? 'active' : ''}" data-status="ALL">
                <span>All</span>
                <span class="pill-count">${this._tasks.length}</span>
              </div>
              <div class="legend-pill todo ${this._filterStatus === 'todo' ? 'active' : ''}" data-status="todo" title="Brown: Pending action, within schedule window">
                <span class="dot todo"></span>
                <span>To Do</span>
                <span class="pill-count">${countTodo}</span>
              </div>
              <div class="legend-pill in_progress ${this._filterStatus === 'in_progress' ? 'active' : ''}" data-status="in_progress" title="Blue: Actively being worked on">
                <span class="dot in_progress"></span>
                <span>In Progress</span>
                <span class="pill-count">${countInProgress}</span>
              </div>
              <div class="legend-pill overdue ${this._filterStatus === 'overdue' ? 'active' : ''}" data-status="overdue" title="Red: Past due date without completion">
                <span class="dot overdue"></span>
                <span>Overdue</span>
                <span class="pill-count">${countOverdue}</span>
              </div>
              <div class="legend-pill complete ${this._filterStatus === 'complete' ? 'active' : ''}" data-status="complete" title="Green: Task finished">
                <span class="dot complete"></span>
                <span>Complete</span>
                <span class="pill-count">${countComplete}</span>
              </div>
            </div>
          `
              : ''
          }

          <!-- Assignee Filter Bar -->
          ${
            this._config.show_assignee_filter
              ? `
            <div class="filter-bar">
              <div class="chip ${this._filterAssignee === 'ALL' ? 'active' : ''}" data-assignee="ALL">
                ${ICONS.account} All Assignees
              </div>
              ${householdPersons
                .map(
                  (person) => `
                <div class="chip ${this._filterAssignee === person ? 'active' : ''}" data-assignee="${person}">
                  ${person}
                </div>
              `
                )
                .join('')}
              <div class="chip ${this._filterAssignee === 'UNASSIGNED' ? 'active' : ''}" data-assignee="UNASSIGNED">
                Unassigned
              </div>
            </div>
          `
              : ''
          }

          <!-- Task List -->
          <div class="task-list">
            ${
              filtered.length === 0
                ? `<div class="empty-state">No household tasks matching the current filters.</div>`
                : filtered
                    .map((task) => {
                      const eff = this._getEffectiveStatus(task);
                      const isComplete = eff === 'complete';
                      const isOverdue = eff === 'overdue';
                      const isInProgress = eff === 'in_progress';
                      const cadenceLabel = getCadenceLabel(task);
                      const relativeDue = formatRelativeDate(task.due_date);

                      return `
                  <div class="task-card ${eff}" data-task-id="${task.id}">
                    <button class="action-btn-check" data-action="toggle-complete" title="${
                      task.is_recurring ? 'Complete & Reschedule next occurrence' : 'Mark Complete'
                    }">
                      ${isComplete ? ICONS.check : ''}
                    </button>

                    <div class="task-content">
                      <div class="task-header-line">
                        <span class="task-title">${this._escape(task.title)}</span>
                        <span class="status-badge ${eff}">
                          ${STATUS_CONFIG[eff]?.label || eff}
                        </span>
                        ${
                          task.is_recurring
                            ? `<span class="meta-tag" title="Recurring task: ${cadenceLabel}">
                                 ${ICONS.repeat} ${cadenceLabel}
                               </span>`
                            : ''
                        }
                      </div>

                      ${
                        task.description
                          ? `<div class="task-desc">${this._escape(task.description)}</div>`
                          : ''
                      }

                      <div class="task-meta">
                        ${
                          task.due_date
                            ? `<span class="meta-item due-date ${isOverdue ? 'overdue' : ''}" title="${task.due_date}">
                                 ${ICONS.calendar} ${relativeDue}
                               </span>`
                            : ''
                        }

                        ${
                          task.assigned_to
                            ? `<span class="meta-item meta-tag" title="Assigned to ${task.assigned_to}">
                                 ${ICONS.account} ${this._escape(task.assigned_to)}
                               </span>`
                            : ''
                        }

                        ${
                          task.completion_count > 0
                            ? `<span class="meta-item" title="Completed ${task.completion_count} times">
                                 ✓ ${task.completion_count}x
                               </span>`
                            : ''
                        }
                      </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="task-actions">
                      ${
                        !isComplete && !isInProgress
                          ? `<button class="btn-icon play" data-action="toggle-progress" title="Start Task (In Progress)">
                               ${ICONS.play}
                             </button>`
                          : ''
                      }
                      ${
                        isInProgress || isComplete
                          ? `<button class="btn-icon undo" data-action="reset-todo" title="Reset to To Do">
                               ${ICONS.undo}
                             </button>`
                          : ''
                      }
                      <button class="btn-icon" data-action="edit-task" title="Edit Task">
                        ${ICONS.edit}
                      </button>
                      <button class="btn-icon del" data-action="delete-task" title="Delete Task">
                        ${ICONS.delete}
                      </button>
                    </div>
                  </div>
                `;
                    })
                    .join('')
            }
          </div>

          <!-- Drawer Modal for Create / Edit -->
          ${
            this._showDrawer
              ? `
            <div class="drawer-overlay" id="drawer-overlay">
              <div class="drawer">
                <div class="drawer-header">
                  <span class="drawer-title">${editingTask ? 'Edit Task' : 'Create Household Task'}</span>
                  <button class="btn-icon" id="btn-close-drawer">${ICONS.close}</button>
                </div>

                <form id="task-form">
                  <div class="form-group">
                    <label class="form-label">Task Title *</label>
                    <input class="form-input" type="text" name="title" required placeholder="e.g. Clean kitchen countertops" value="${
                      editingTask ? this._escape(editingTask.title) : ''
                    }">
                  </div>

                  <div class="form-group">
                    <label class="form-label">Description / Instructions</label>
                    <textarea class="form-textarea" name="description" placeholder="Notes, steps, or supplies needed...">${
                      editingTask ? this._escape(editingTask.description || '') : ''
                    }</textarea>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Due Date & Time</label>
                    <input class="form-input" type="datetime-local" name="due_date" value="${
                      editingTask && editingTask.due_date ? editingTask.due_date.slice(0, 16) : ''
                    }">
                  </div>

                  <div class="form-group">
                    <label class="form-label">Assignee</label>
                    <select class="form-select" name="assigned_to">
                      <option value="">-- Unassigned --</option>
                      ${householdPersons
                        .map(
                          (person) => `
                        <option value="${person}" ${
                            editingTask && editingTask.assigned_to === person ? 'selected' : ''
                          }>${person}</option>
                      `
                        )
                        .join('')}
                    </select>
                  </div>

                  <div class="toggle-row">
                    <div class="toggle-info">
                      <span class="toggle-title">Recurring Task</span>
                      <span class="toggle-subtitle">Auto-reschedule when completed</span>
                    </div>
                    <label class="custom-switch">
                      <input type="checkbox" name="is_recurring" id="field-is-recurring" ${
                        editingTask && editingTask.is_recurring ? 'checked' : ''
                      }>
                      <span class="slider"></span>
                    </label>
                  </div>

                  <div class="recurrence-fields" id="recurrence-options" style="${
                    editingTask && editingTask.is_recurring ? 'display:block;' : 'display:none;'
                  }">
                    <div class="form-group">
                      <label class="form-label">Cadence</label>
                      <select class="form-select" name="recurrence_cadence" id="field-cadence">
                        <option value="daily" ${
                          editingTask?.recurrence_cadence === 'daily' ? 'selected' : ''
                        }>Daily</option>
                        <option value="weekly" ${
                          editingTask?.recurrence_cadence === 'weekly' ? 'selected' : ''
                        }>Weekly</option>
                        <option value="monthly" ${
                          editingTask?.recurrence_cadence === 'monthly' ? 'selected' : ''
                        }>Monthly</option>
                        <option value="custom" ${
                          editingTask?.recurrence_cadence === 'custom' ? 'selected' : ''
                        }>Custom Interval</option>
                      </select>
                    </div>

                    <div id="custom-interval-wrap" style="${
                      editingTask?.recurrence_cadence === 'custom' ? 'display:flex;' : 'display:none;'
                    } gap: 8px;">
                      <div style="flex: 1;">
                        <label class="form-label">Every</label>
                        <input class="form-input" type="number" min="1" max="365" name="recurrence_interval" value="${
                          editingTask?.recurrence_interval || 1
                        }">
                      </div>
                      <div style="flex: 1;">
                        <label class="form-label">Unit</label>
                        <select class="form-select" name="recurrence_unit">
                          <option value="days" ${
                            editingTask?.recurrence_unit === 'days' ? 'selected' : ''
                          }>Days</option>
                          <option value="weeks" ${
                            editingTask?.recurrence_unit === 'weeks' ? 'selected' : ''
                          }>Weeks</option>
                          <option value="months" ${
                            editingTask?.recurrence_unit === 'months' ? 'selected' : ''
                          }>Months</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  ${
                    editingTask
                      ? `
                    <div class="form-group">
                      <label class="form-label">Status</label>
                      <select class="form-select" name="status">
                        <option value="todo" ${
                          editingTask.status === 'todo' ? 'selected' : ''
                        }>To Do (Brown)</option>
                        <option value="in_progress" ${
                          editingTask.status === 'in_progress' ? 'selected' : ''
                        }>In Progress (Blue)</option>
                        <option value="complete" ${
                          editingTask.status === 'complete' ? 'selected' : ''
                        }>Complete (Green)</option>
                      </select>
                    </div>
                  `
                      : ''
                  }

                  <div class="form-actions">
                    <button type="button" class="btn-cancel" id="btn-cancel-drawer">Cancel</button>
                    <button type="submit" class="btn-primary">${editingTask ? 'Save Changes' : 'Create Task'}</button>
                  </div>
                </form>
              </div>
            </div>
          `
              : ''
          }
        </div>
      `;

      this._attachEventListeners();
    }

    _attachEventListeners() {
      const root = this.shadowRoot;

      // Status legend pills
      root.querySelectorAll('.legend-pill').forEach((pill) => {
        pill.addEventListener('click', () => {
          const status = pill.getAttribute('data-status');
          this._filterStatus = this._filterStatus === status && status !== 'ALL' ? 'ALL' : status;
          this._render();
        });
      });

      // Assignee chips
      root.querySelectorAll('.chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          const assignee = chip.getAttribute('data-assignee');
          this._filterAssignee = this._filterAssignee === assignee && assignee !== 'ALL' ? 'ALL' : assignee;
          this._render();
        });
      });

      // Add task button
      const addBtn = root.querySelector('#btn-add-task');
      if (addBtn) addBtn.addEventListener('click', () => this._handleOpenNewTask());

      // Drawer close / cancel
      const closeBtn = root.querySelector('#btn-close-drawer');
      if (closeBtn) closeBtn.addEventListener('click', () => this._handleCloseDrawer());
      const cancelBtn = root.querySelector('#btn-cancel-drawer');
      if (cancelBtn) cancelBtn.addEventListener('click', () => this._handleCloseDrawer());

      // Drawer overlay click outside
      const overlay = root.querySelector('#drawer-overlay');
      if (overlay) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) this._handleCloseDrawer();
        });
      }

      // Drawer recurrence toggle
      const recCheckbox = root.querySelector('#field-is-recurring');
      const recOptions = root.querySelector('#recurrence-options');
      const cadenceSelect = root.querySelector('#field-cadence');
      const customWrap = root.querySelector('#custom-interval-wrap');

      if (recCheckbox && recOptions) {
        recCheckbox.addEventListener('change', () => {
          recOptions.style.display = recCheckbox.checked ? 'block' : 'none';
        });
      }

      if (cadenceSelect && customWrap) {
        cadenceSelect.addEventListener('change', () => {
          customWrap.style.display = cadenceSelect.value === 'custom' ? 'flex' : 'none';
        });
      }

      // Form submit
      const form = root.querySelector('#task-form');
      if (form) {
        form.addEventListener('submit', (e) => this._handleSaveForm(e));
      }

      // Task row actions
      root.querySelectorAll('.task-card').forEach((card) => {
        const taskId = card.getAttribute('data-task-id');
        const task = this._tasks.find((t) => t.id === taskId);
        if (!task) return;

        const checkBtn = card.querySelector('[data-action="toggle-complete"]');
        if (checkBtn) {
          checkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._handleToggleComplete(task);
          });
        }

        const progBtn = card.querySelector('[data-action="toggle-progress"]');
        if (progBtn) {
          progBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._handleToggleInProgress(task);
          });
        }

        const undoBtn = card.querySelector('[data-action="reset-todo"]');
        if (undoBtn) {
          undoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._handleResetToTodo(task);
          });
        }

        const editBtn = card.querySelector('[data-action="edit-task"]');
        if (editBtn) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._handleOpenEditTask(task);
          });
        }

        const delBtn = card.querySelector('[data-action="delete-task"]');
        if (delBtn) {
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._handleDeleteTask(task);
          });
        }
      });
    }

    _escape(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    getCardSize() {
      return 2 + Math.min(8, this._tasks.length);
    }

    static getStubConfig() {
      return {
        title: 'HOUSEHOLD TASK & CHORE MANAGER',
        show_legend: true,
        show_assignee_filter: true,
        show_add_button: true,
      };
    }
  }

  // Register Custom Element
  if (!customElements.get('task-manager-card')) {
    customElements.define('task-manager-card', TaskManagerCard);
  }

  // Register in customCards registry
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'task-manager-card',
    name: 'Task & Chore Manager Card',
    description: 'Chore and task management card with strict color-coded status lifecycle, recurrence engine, and assignee filters',
    preview: true,
  });

  console.info(
    '%c TASK & CHORE MANAGER CARD %c v' + CARD_VERSION + ' ',
    'background:#1976D2;color:#ffffff;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px;',
    'background:#2E7D32;color:#ffffff;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0;'
  );
})();
