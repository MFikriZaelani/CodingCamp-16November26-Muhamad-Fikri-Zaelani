/* =============================================================
   js/app.js — To-Do List Life Dashboard
   Interactive, User-Friendly Dashboard with Dark/Light Theme,
   Custom Greeting Name, Pomodoro Duration Presets, Duplicate Task
   Prevention, and Task Sorting.
   ============================================================= */

/* -------------------------------------------------------------
   Section 1: Utility Functions (pure, no DOM / IO)
   ------------------------------------------------------------- */

/**
 * Returns HH:MM zero-padded 24-hour string for the given Date.
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Returns "<Weekday>, <DD> <Month> <YYYY>" string.
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months   = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
  const weekday = weekdays[date.getDay()];
  const day     = date.getDate();
  const month   = months[date.getMonth()];
  const year    = date.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

/**
 * Returns the appropriate greeting string for the given hour (0–23).
 * [5,12) → "Good Morning", [12,18) → "Good Afternoon",
 * [18,21) → "Good Evening", otherwise → "Good Night"
 * @param {number} hour
 * @returns {string}
 */
function getGreeting(hour) {
  if (hour >= 5 && hour < 12)  return 'Good Morning';
  if (hour >= 12 && hour < 18) return 'Good Afternoon';
  if (hour >= 18 && hour < 21) return 'Good Evening';
  return 'Good Night';
}

/**
 * Returns MM:SS zero-padded for a total-seconds value.
 * Supports minutes > 25 (e.g. 50:00, 120:00).
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTimer(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Returns true iff url starts with "http://" or "https://".
 * @param {string} url
 * @returns {boolean}
 */
function isValidURL(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

/**
 * Returns true iff str is empty or whitespace-only.
 * @param {string} str
 * @returns {boolean}
 */
function isBlank(str) {
  return typeof str !== 'string' || str.trim().length === 0;
}

/**
 * Checks if a task description already exists (case-insensitive & trimmed).
 * @param {Task[]} tasks
 * @param {string} description
 * @param {string} [excludeId]
 * @returns {boolean}
 */
function isDuplicateTask(tasks, description, excludeId = null) {
  if (!Array.isArray(tasks) || typeof description !== 'string') return false;
  const normalized = description.trim().toLowerCase();
  if (normalized.length === 0) return false;

  return tasks.some(function (task) {
    if (excludeId && task.id === excludeId) return false;
    return typeof task.description === 'string' && task.description.trim().toLowerCase() === normalized;
  });
}

/**
 * Pure function to sort tasks.
 * @param {Task[]} tasks
 * @param {string} mode
 * @returns {Task[]}
 */
function sortTasks(tasks, mode = 'default') {
  if (!Array.isArray(tasks)) return [];
  const copy = [...tasks];

  switch (mode) {
    case 'az':
      return copy.sort((a, b) => (a.description || '').localeCompare(b.description || '', undefined, { sensitivity: 'base' }));
    case 'za':
      return copy.sort((a, b) => (b.description || '').localeCompare(a.description || '', undefined, { sensitivity: 'base' }));
    case 'incomplete':
      return copy.sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));
    case 'completed':
      return copy.sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? -1 : 1));
    case 'default':
    default:
      return copy;
  }
}

/**
 * Serializes a Task array to a JSON string.
 * @param {Task[]} tasks
 * @returns {string}
 */
function serializeTasks(tasks) {
  return JSON.stringify(tasks);
}

/**
 * Deserializes a JSON string to a Task array.
 * Returns null on parse failure or if the result is not an array.
 * @param {string} json
 * @returns {Task[]|null}
 */
function deserializeTasks(json) {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

/**
 * Serializes a Link array to a JSON string.
 * @param {Link[]} links
 * @returns {string}
 */
function serializeLinks(links) {
  return JSON.stringify(links);
}

/**
 * Deserializes a JSON string to a Link array.
 * Returns null on parse failure or if the result is not an array.
 * @param {string} json
 * @returns {Link[]|null}
 */
function deserializeLinks(json) {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

/* -------------------------------------------------------------
   Section 2: Storage Module
   localStorage keys:
   - tld_tasks: tasks list
   - tld_links: quick links
   - tld_theme: 'light' or 'dark'
   - tld_user_name: custom user name string
   - tld_timer_minutes: saved focus duration in minutes (number)
   - tld_task_sort: 'default' | 'az' | 'za' | 'incomplete' | 'completed'
   ------------------------------------------------------------- */

const StorageModule = (function () {
  let _onCorruptLinks = null;

  function registerOnCorruptLinks(callback) {
    _onCorruptLinks = callback;
  }

  function loadTasks() {
    const raw = localStorage.getItem('tld_tasks');
    if (raw === null) return [];
    const tasks = deserializeTasks(raw);
    if (tasks === null) {
      console.error('tld_tasks: corrupt data, initializing empty');
      return [];
    }
    return tasks;
  }

  function saveTasks(tasks) {
    try {
      localStorage.setItem('tld_tasks', serializeTasks(tasks));
      return true;
    } catch (err) {
      console.error('Failed to save tasks:', err);
      return false;
    }
  }

  function loadLinks() {
    const raw = localStorage.getItem('tld_links');
    if (raw === null) return [];
    const links = deserializeLinks(raw);
    if (links === null) {
      console.error('tld_links: corrupt data, initializing empty');
      if (typeof _onCorruptLinks === 'function') {
        _onCorruptLinks();
      }
      return [];
    }
    return links;
  }

  function saveLinks(links) {
    try {
      localStorage.setItem('tld_links', serializeLinks(links));
      return { ok: true };
    } catch (_) {
      return { ok: false };
    }
  }

  // Theme preferences
  function loadTheme() {
    return localStorage.getItem('tld_theme');
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem('tld_theme', theme);
    } catch (_) {}
  }

  // Custom User Name
  function loadUserName() {
    const name = localStorage.getItem('tld_user_name');
    return typeof name === 'string' ? name.trim() : '';
  }

  function saveUserName(name) {
    try {
      if (!name || name.trim().length === 0) {
        localStorage.removeItem('tld_user_name');
      } else {
        localStorage.setItem('tld_user_name', name.trim());
      }
    } catch (_) {}
  }

  // Pomodoro timer duration in minutes
  function loadTimerMinutes() {
    const raw = localStorage.getItem('tld_timer_minutes');
    const parsed = parseInt(raw, 10);
    return !isNaN(parsed) && parsed >= 1 && parsed <= 120 ? parsed : null;
  }

  function saveTimerMinutes(minutes) {
    try {
      localStorage.setItem('tld_timer_minutes', String(minutes));
    } catch (_) {}
  }

  // Task sort mode
  function loadTaskSort() {
    return localStorage.getItem('tld_task_sort') || 'default';
  }

  function saveTaskSort(sortMode) {
    try {
      localStorage.setItem('tld_task_sort', sortMode);
    } catch (_) {}
  }

  return {
    registerOnCorruptLinks,
    loadTasks,
    saveTasks,
    loadLinks,
    saveLinks,
    loadTheme,
    saveTheme,
    loadUserName,
    saveUserName,
    loadTimerMinutes,
    saveTimerMinutes,
    loadTaskSort,
    saveTaskSort,
  };
})();

/* -------------------------------------------------------------
   Section 3: Theme Module (Light / Dark Mode)
   ------------------------------------------------------------- */

const ThemeModule = (function () {
  let _themeBtn = null;
  let _currentTheme = 'light';

  function _applyTheme(theme) {
    _currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    StorageModule.saveTheme(theme);

    if (_themeBtn) {
      const isDark = theme === 'dark';
      const icon = _themeBtn.querySelector('.theme-icon');
      const label = _themeBtn.querySelector('.theme-label');

      if (icon) icon.textContent = isDark ? '☀️' : '🌙';
      if (label) label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
      _themeBtn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  function init() {
    _themeBtn = document.getElementById('btn-theme-toggle');

    // Determine initial theme: saved preference -> system dark mode -> default light
    const saved = StorageModule.loadTheme();
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = saved || (systemPrefersDark ? 'dark' : 'light');

    _applyTheme(initialTheme);

    if (_themeBtn) {
      _themeBtn.addEventListener('click', function () {
        const nextTheme = _currentTheme === 'dark' ? 'light' : 'dark';
        _applyTheme(nextTheme);
      });
    }

    // Listen to OS theme changes if user has not explicitly chosen one
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!StorageModule.loadTheme()) {
          _applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  return { init };
})();

/* -------------------------------------------------------------
   Section 4: Greeting Module (with Custom Name)
   ------------------------------------------------------------- */

const GreetingModule = (function () {
  let _dom = {
    root: null,
    timeEl: null,
    dateEl: null,
    msgEl: null,
    btnEditName: null,
    nameForm: null,
    nameInput: null,
    btnCancelName: null,
  };

  function _render(now) {
    if (!_dom.root) return;

    _dom.timeEl.textContent = formatTime(now);
    _dom.dateEl.textContent = formatDate(now);

    const salutation = getGreeting(now.getHours());
    const userName = StorageModule.loadUserName();

    if (userName) {
      _dom.msgEl.textContent = `${salutation}, ${userName}!`;
      _dom.btnEditName.textContent = '✏️ Edit Name';
    } else {
      _dom.msgEl.textContent = `${salutation}!`;
      _dom.btnEditName.textContent = '✏️ Set Name';
    }
  }

  function _showNameForm() {
    _dom.nameInput.value = StorageModule.loadUserName();
    _dom.nameForm.hidden = false;
    _dom.nameInput.focus();
  }

  function _hideNameForm() {
    _dom.nameForm.hidden = true;
  }

  function init(root) {
    _dom.root          = root;
    _dom.timeEl        = root.querySelector('.greeting-time');
    _dom.dateEl        = root.querySelector('.greeting-date');
    _dom.msgEl         = root.querySelector('.greeting-message');
    _dom.btnEditName   = root.querySelector('#btn-name-edit');
    _dom.nameForm      = root.querySelector('#greeting-name-form');
    _dom.nameInput     = root.querySelector('#greeting-name-input');
    _dom.btnCancelName = root.querySelector('#btn-cancel-name');

    _render(new Date());

    // Auto-update every 60 seconds
    setInterval(function () {
      _render(new Date());
    }, 60000);

    // Toggle name form
    if (_dom.btnEditName) {
      _dom.btnEditName.addEventListener('click', function () {
        if (_dom.nameForm.hidden) {
          _showNameForm();
        } else {
          _hideNameForm();
        }
      });
    }

    // Cancel name form
    if (_dom.btnCancelName) {
      _dom.btnCancelName.addEventListener('click', function () {
        _hideNameForm();
      });
    }

    // Submit name form
    if (_dom.nameForm) {
      _dom.nameForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const inputName = _dom.nameInput.value.trim().slice(0, 30);
        StorageModule.saveUserName(inputName);
        _hideNameForm();
        _render(new Date());
      });
    }
  }

  return { init };
})();

/* -------------------------------------------------------------
   Section 5: Timer Module (Configurable Pomodoro Time)
   ------------------------------------------------------------- */

const TimerModule = (function () {
  let _durationMinutes = 25;

  const _state = {
    remainingSeconds: 1500,
    totalSeconds: 1500,
    status: 'idle', // 'idle' | 'running' | 'paused' | 'done'
  };

  let _intervalId = null;

  let _dom = {
    display: null,
    btnStart: null,
    btnStop: null,
    btnReset: null,
    doneBanner: null,
    presetBtns: [],
    customForm: null,
    customInput: null,
  };

  function _updatePresetUI(minutes) {
    _dom.presetBtns.forEach(function (btn) {
      const btnMin = parseInt(btn.dataset.minutes, 10);
      if (btnMin === minutes) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function _setDuration(minutes) {
    const validMinutes = Math.min(Math.max(1, Math.floor(minutes)), 120);
    _durationMinutes = validMinutes;
    _state.totalSeconds = validMinutes * 60;

    // Reset countdown to new duration
    if (_intervalId !== null) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
    _state.remainingSeconds = _state.totalSeconds;
    _state.status = 'idle';

    StorageModule.saveTimerMinutes(validMinutes);
    _updatePresetUI(validMinutes);
    _render();
  }

  function _tick() {
    if (_state.status !== 'running') return;
    _state.remainingSeconds -= 1;
    if (_state.remainingSeconds <= 0) {
      _state.remainingSeconds = 0;
      _state.status = 'done';
      clearInterval(_intervalId);
      _intervalId = null;
    }
    _render();
  }

  function start() {
    if (_state.status === 'running') return;
    if (_state.status === 'done') return;
    _state.status = 'running';
    _intervalId = setInterval(_tick, 1000);
    _render();
  }

  function stop() {
    if (_state.status !== 'running') return;
    _state.status = 'paused';
    clearInterval(_intervalId);
    _intervalId = null;
    _render();
  }

  function reset() {
    if (_intervalId !== null) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
    _state.remainingSeconds = _state.totalSeconds;
    _state.status = 'idle';
    _render();
  }

  function _render() {
    if (!_dom.display) return;

    _dom.display.textContent = formatTimer(_state.remainingSeconds);
    _dom.btnStart.disabled = (_state.status === 'running');

    if (_state.status === 'done') {
      _dom.doneBanner.hidden = false;
    } else {
      _dom.doneBanner.hidden = true;
    }
  }

  function init(root) {
    _dom.display     = root.querySelector('#timer-display');
    _dom.btnStart    = root.querySelector('#btn-start');
    _dom.btnStop     = root.querySelector('#btn-stop');
    _dom.btnReset    = root.querySelector('#btn-reset');
    _dom.doneBanner  = root.querySelector('#timer-done-banner');
    _dom.presetBtns  = Array.from(root.querySelectorAll('.btn-preset'));
    _dom.customForm  = root.querySelector('#timer-custom-form');
    _dom.customInput = root.querySelector('#timer-custom-input');

    // Load saved or default duration
    const savedDuration = StorageModule.loadTimerMinutes();
    if (savedDuration) {
      _durationMinutes = savedDuration;
    }
    _state.totalSeconds = _durationMinutes * 60;
    _state.remainingSeconds = _state.totalSeconds;

    _dom.btnStart.addEventListener('click', start);
    _dom.btnStop.addEventListener('click', stop);
    _dom.btnReset.addEventListener('click', reset);

    // Preset click listeners
    _dom.presetBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const min = parseInt(btn.dataset.minutes, 10);
        if (!isNaN(min)) {
          _setDuration(min);
          if (_dom.customInput) _dom.customInput.value = '';
        }
      });
    });

    // Custom duration form
    if (_dom.customForm) {
      _dom.customForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const customVal = parseInt(_dom.customInput.value, 10);
        if (!isNaN(customVal) && customVal >= 1 && customVal <= 120) {
          _setDuration(customVal);
        } else {
          _dom.customInput.focus();
        }
      });
    }

    _updatePresetUI(_durationMinutes);
    _render();
  }

  return { init, start, stop, reset, setDuration: _setDuration };
})();

/* -------------------------------------------------------------
   Section 6: Tasks Module (Duplicate Prevention & Sorting)
   ------------------------------------------------------------- */

/**
 * Pure functions for task operations
 */
function _generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function addTask(list, description) {
  if (isBlank(description) || description.length > 500) {
    return list;
  }
  // Prevent duplicate task addition
  if (isDuplicateTask(list, description)) {
    return list;
  }
  const newTask = {
    id: _generateId(),
    description: description.trim(),
    completed: false,
    createdAt: Date.now(),
  };
  return list.concat(newTask);
}

function editTask(list, id, newDescription) {
  if (isBlank(newDescription) || newDescription.length > 500) {
    return list;
  }
  if (isDuplicateTask(list, newDescription, id)) {
    return list;
  }
  return list.map(function (task) {
    if (task.id === id) {
      return { id: task.id, description: newDescription.trim(), completed: task.completed, createdAt: task.createdAt || Date.now() };
    }
    return task;
  });
}

function deleteTask(list, id) {
  return list.filter(function (task) {
    return task.id !== id;
  });
}

function toggleTask(list, id) {
  return list.map(function (task) {
    if (task.id === id) {
      return { id: task.id, description: task.description, completed: !task.completed, createdAt: task.createdAt || Date.now() };
    }
    return task;
  });
}

const TasksModule = (function () {
  let _tasks = [];
  let _currentSort = 'default';

  let _dom = {
    root: null,
    ul: null,
    errorEl: null,
    addInput: null,
    sortSelect: null,
    statsEl: null,
  };

  function _updateStats() {
    if (!_dom.statsEl) return;
    const total = _tasks.length;
    const completed = _tasks.filter(t => t.completed).length;
    if (total === 0) {
      _dom.statsEl.textContent = '0 tasks';
    } else {
      _dom.statsEl.textContent = `${completed} of ${total} done`;
    }
  }

  function _renderList() {
    const ul = _dom.ul;
    ul.innerHTML = '';

    const displayedTasks = sortTasks(_tasks, _currentSort);

    displayedTasks.forEach(function (task) {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.completed ? ' completed' : '');
      li.dataset.id = task.id;

      // Checkbox toggle
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', `Mark task "${task.description}" as ${task.completed ? 'incomplete' : 'complete'}`);
      checkbox.addEventListener('change', function () {
        _tasks = toggleTask(_tasks, task.id);
        StorageModule.saveTasks(_tasks);
        _renderList();
      });

      // Description span
      const span = document.createElement('span');
      span.className = 'task-description';
      span.textContent = task.description;

      // Action buttons container
      const actions = document.createElement('div');
      actions.className = 'task-actions';

      // Edit button
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn-edit';
      btnEdit.textContent = 'Edit';
      btnEdit.type = 'button';
      btnEdit.setAttribute('aria-label', `Edit task: ${task.description}`);
      btnEdit.addEventListener('click', function () {
        _activateEditMode(li, task);
      });

      // Delete button
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn-delete';
      btnDelete.textContent = 'Delete';
      btnDelete.type = 'button';
      btnDelete.setAttribute('aria-label', `Delete task: ${task.description}`);
      btnDelete.addEventListener('click', function () {
        _tasks = deleteTask(_tasks, task.id);
        StorageModule.saveTasks(_tasks);
        _renderList();
      });

      actions.appendChild(btnEdit);
      actions.appendChild(btnDelete);

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(actions);

      ul.appendChild(li);
    });

    _updateStats();
  }

  function _activateEditMode(li, task) {
    const existingSpan = li.querySelector('.task-description');
    const existingActions = li.querySelector('.task-actions');
    if (existingSpan) li.removeChild(existingSpan);
    if (existingActions) li.removeChild(existingActions);

    const editForm = document.createElement('div');
    editForm.className = 'task-edit-form';

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.value = task.description;
    editInput.setAttribute('aria-label', 'Edit task description');

    const btnConfirm = document.createElement('button');
    btnConfirm.className = 'btn-confirm';
    btnConfirm.textContent = 'Confirm';
    btnConfirm.type = 'button';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn-cancel';
    btnCancel.textContent = 'Cancel';
    btnCancel.type = 'button';

    editForm.appendChild(editInput);
    editForm.appendChild(btnConfirm);
    editForm.appendChild(btnCancel);

    li.appendChild(editForm);
    editInput.focus();

    function handleSave() {
      const newDesc = editInput.value.trim();
      _dom.errorEl.textContent = '';

      if (isBlank(newDesc)) {
        editInput.focus();
        return;
      }
      if (newDesc.length > 500) {
        _dom.errorEl.textContent = 'Task description must be 500 characters or fewer.';
        editInput.focus();
        return;
      }
      // Check for duplicate on edit
      if (isDuplicateTask(_tasks, newDesc, task.id)) {
        _dom.errorEl.textContent = 'A task with this description already exists.';
        editInput.focus();
        return;
      }

      _tasks = editTask(_tasks, task.id, newDesc);
      StorageModule.saveTasks(_tasks);
      _renderList();
    }

    btnConfirm.addEventListener('click', handleSave);

    editInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        _renderList();
      }
    });

    btnCancel.addEventListener('click', function () {
      _renderList();
    });
  }

  function init(root) {
    _dom.root       = root;
    _tasks          = StorageModule.loadTasks();
    _currentSort    = StorageModule.loadTaskSort();

    const form      = root.querySelector('.task-add-form');
    _dom.addInput   = form.querySelector('input[type="text"]');
    _dom.errorEl    = root.querySelector('.task-error');
    _dom.ul         = root.querySelector('.task-list');
    _dom.sortSelect = root.querySelector('#task-sort-select');
    _dom.statsEl    = root.querySelector('#task-stats');

    // Sync sort dropdown with loaded preference
    if (_dom.sortSelect) {
      _dom.sortSelect.value = _currentSort;
      _dom.sortSelect.addEventListener('change', function (e) {
        _currentSort = e.target.value;
        StorageModule.saveTaskSort(_currentSort);
        _renderList();
      });
    }

    // Initial render
    _renderList();

    // Add task submit handler
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const desc = _dom.addInput.value;
      _dom.errorEl.textContent = '';

      // Blank check
      if (isBlank(desc)) {
        _dom.addInput.focus();
        return;
      }

      // Max length check
      if (desc.length > 500) {
        _dom.errorEl.textContent = 'Task description must be 500 characters or fewer.';
        _dom.addInput.focus();
        return;
      }

      // Duplicate prevention check
      if (isDuplicateTask(_tasks, desc)) {
        _dom.errorEl.textContent = 'A task with this description already exists.';
        _dom.addInput.focus();
        return;
      }

      // Add task
      _tasks = addTask(_tasks, desc);
      StorageModule.saveTasks(_tasks);
      _renderList();
      _dom.addInput.value = '';
      _dom.addInput.focus();
    });
  }

  return { init };
})();

/* -------------------------------------------------------------
   Section 7: Links Module
   ------------------------------------------------------------- */

function addLink(links, label, url) {
  if (isBlank(label) || label.length > 100) return links;
  if (!isValidURL(url)) return links;
  if (links.length >= 50) return links;

  const newLink = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    label: label.trim(),
    url: url.trim(),
  };
  return links.concat(newLink);
}

function deleteLink(links, id) {
  return links.filter(function (link) {
    return link.id !== id;
  });
}

const LinksModule = (function () {
  let _links = [];

  let _dom = {
    root: null,
    errorBanner: null,
    saveError: null,
    linkList: null,
    form: null,
    labelInput: null,
    urlInput: null,
    labelError: null,
    urlError: null,
  };

  function _showError(el, msg) {
    el.textContent = msg;
    el.hidden = false;
  }

  function _hideError(el) {
    el.textContent = '';
    el.hidden = true;
  }

  function _renderLinks() {
    const list = _dom.linkList;
    list.innerHTML = '';

    _links.forEach(function (link) {
      const entry = document.createElement('div');
      entry.className = 'link-entry';

      const anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.textContent = link.label;
      anchor.className = 'link-btn';
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.setAttribute('title', link.url);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-delete-link';
      delBtn.textContent = '✕';
      delBtn.setAttribute('aria-label', 'Delete link: ' + link.label);

      delBtn.addEventListener('click', function () {
        _links = deleteLink(_links, link.id);
        const result = StorageModule.saveLinks(_links);
        if (!result.ok) {
          _showError(_dom.saveError, 'Link could not be saved permanently.');
        } else {
          _hideError(_dom.saveError);
        }
        _renderLinks();
      });

      entry.appendChild(anchor);
      entry.appendChild(delBtn);
      list.appendChild(entry);
    });
  }

  function _validateForm() {
    let valid = true;
    const label = _dom.labelInput.value;
    const url = _dom.urlInput.value;

    _hideError(_dom.labelError);
    _hideError(_dom.urlError);
    _dom.labelInput.classList.remove('input-error');
    _dom.urlInput.classList.remove('input-error');

    if (_links.length >= 50) {
      _showError(_dom.labelError, 'Maximum of 50 links reached. Delete a link to add a new one.');
      _dom.labelInput.classList.add('input-error');
      return false;
    }

    if (isBlank(label)) {
      _showError(_dom.labelError, 'Label is required.');
      _dom.labelInput.classList.add('input-error');
      valid = false;
    }

    if (isBlank(url)) {
      _showError(_dom.urlError, 'URL is required.');
      _dom.urlInput.classList.add('input-error');
      valid = false;
    } else if (!isValidURL(url)) {
      _showError(_dom.urlError, 'URL must begin with http:// or https://.');
      _dom.urlInput.classList.add('input-error');
      valid = false;
    }

    return valid;
  }

  function init(root) {
    _dom.root        = root;
    _dom.errorBanner = root.querySelector('.links-error-banner');
    _dom.saveError   = root.querySelector('.links-save-error');
    _dom.linkList    = root.querySelector('.link-list');
    _dom.form        = root.querySelector('.link-add-form');
    _dom.labelInput  = root.querySelector('#link-label-input');
    _dom.urlInput    = root.querySelector('#link-url-input');
    _dom.labelError  = root.querySelector('#link-label-error');
    _dom.urlError    = root.querySelector('#link-url-error');

    _dom.errorBanner.hidden = true;
    _dom.saveError.hidden   = true;
    _dom.labelError.hidden  = true;
    _dom.urlError.hidden    = true;

    StorageModule.registerOnCorruptLinks(function () {
      _showError(_dom.errorBanner, 'Saved links could not be loaded (data was corrupted). Starting with an empty list.');
    });

    _links = StorageModule.loadLinks();
    _renderLinks();

    _dom.form.addEventListener('submit', function (e) {
      e.preventDefault();
      _hideError(_dom.saveError);

      if (!_validateForm()) return;

      const label = _dom.labelInput.value.trim();
      const url   = _dom.urlInput.value.trim();

      const newLinks = addLink(_links, label, url);

      if (newLinks === _links) {
        _showError(_dom.labelError, 'Maximum of 50 links reached. Delete a link to add a new one.');
        return;
      }

      const result = StorageModule.saveLinks(newLinks);
      if (!result.ok) {
        _showError(_dom.saveError, 'Link could not be saved permanently.');
      }

      _links = newLinks;
      _renderLinks();

      _dom.labelInput.value = '';
      _dom.urlInput.value   = '';
      _dom.labelInput.focus();
    });
  }

  return { init };
})();

/* -------------------------------------------------------------
   Section 8: Bootstrap — DOMContentLoaded handler
   ------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', function () {
  // Initialize Theme Switcher
  try {
    ThemeModule.init();
  } catch (err) {
    console.error('ThemeModule failed to initialise:', err);
  }

  // Initialize Widgets
  const modules = [
    { name: 'GreetingModule', module: GreetingModule, rootId: 'widget-greeting' },
    { name: 'TimerModule',    module: TimerModule,    rootId: 'widget-timer'    },
    { name: 'TasksModule',    module: TasksModule,    rootId: 'widget-tasks'    },
    { name: 'LinksModule',    module: LinksModule,    rootId: 'widget-links'    },
  ];

  modules.forEach(function (entry) {
    try {
      const root = document.getElementById(entry.rootId);
      if (root) {
        entry.module.init(root);
      }
    } catch (err) {
      console.error(entry.name + ' failed to initialise:', err);
      const fallbackRoot = document.getElementById(entry.rootId);
      if (fallbackRoot) {
        fallbackRoot.textContent = 'Could not load widget';
      }
    }
  });
});
