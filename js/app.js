/* =============================================================
   js/app.js — To-Do List Life Dashboard
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
 * Returns MM:SS zero-padded for a total-seconds value in [0, 1500].
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTimer(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
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
   localStorage keys: tld_tasks (tasks), tld_links (links)
   ------------------------------------------------------------- */

const StorageModule = (function () {
  /** Callback registered by LinksModule to handle corrupt link data. */
  let _onCorruptLinks = null;

  /**
   * Register a callback that is invoked when tld_links data is found
   * to be corrupt on load. LinksModule calls this during its init.
   * @param {Function} callback
   */
  function registerOnCorruptLinks(callback) {
    _onCorruptLinks = callback;
  }

  /**
   * Reads tld_tasks from localStorage.
   * Returns [] when the key is absent or the stored value is corrupt
   * (not valid JSON or not an array). Logs console.error on corruption.
   * @returns {Task[]}
   */
  function loadTasks() {
    const raw = localStorage.getItem('tld_tasks');
    if (raw === null) {
      return [];
    }
    const tasks = deserializeTasks(raw);
    if (tasks === null) {
      console.error('tld_tasks: corrupt data, initializing empty');
      return [];
    }
    return tasks;
  }

  /**
   * Writes the serialized task collection to tld_tasks.
   * @param {Task[]} tasks
   */
  function saveTasks(tasks) {
    localStorage.setItem('tld_tasks', serializeTasks(tasks));
  }

  /**
   * Reads tld_links from localStorage.
   * Returns [] when the key is absent or the stored value is corrupt.
   * On corruption: logs console.error and invokes the registered
   * onCorruptLinks callback (if any) so the Links widget can display
   * an error message.
   * @returns {Link[]}
   */
  function loadLinks() {
    const raw = localStorage.getItem('tld_links');
    if (raw === null) {
      return [];
    }
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

  /**
   * Writes the serialized link collection to tld_links.
   * Returns { ok: true } on success.
   * Returns { ok: false } if the write throws (e.g. quota exceeded).
   * @param {Link[]} links
   * @returns {{ ok: boolean }}
   */
  function saveLinks(links) {
    try {
      localStorage.setItem('tld_links', serializeLinks(links));
      return { ok: true };
    } catch (_) {
      return { ok: false };
    }
  }

  return {
    registerOnCorruptLinks,
    loadTasks,
    saveTasks,
    loadLinks,
    saveLinks,
  };
})();

/* -------------------------------------------------------------
   Section 3: Greeting Module
   Displays current time, date, and a time-of-day greeting.
   Updates every 60 seconds so threshold crossings are detected.
   ------------------------------------------------------------- */

const GreetingModule = (function () {
  /**
   * Renders time, date, and greeting into the three child elements.
   * @param {HTMLElement} root
   * @param {Date} now
   */
  function _render(root, now) {
    root.querySelector('.greeting-time').textContent    = formatTime(now);
    root.querySelector('.greeting-date').textContent    = formatDate(now);
    root.querySelector('.greeting-message').textContent = getGreeting(now.getHours());
  }

  /**
   * Initialises the Greeting widget.
   * Renders immediately, then schedules re-render every 60 000 ms.
   * @param {HTMLElement} root  — the #widget-greeting element
   */
  function init(root) {
    _render(root, new Date());
    setInterval(function () {
      _render(root, new Date());
    }, 60000);
  }

  return { init };
})();

/* -------------------------------------------------------------
   Section 4: Timer Module
   25-minute countdown timer with Start, Stop, and Reset controls.
   State machine: idle → running → paused → idle (via reset)
                                            done  (via countdown reaching 0)
   ------------------------------------------------------------- */

const TimerModule = (function () {
  /** In-memory timer state (never persisted). */
  const _state = {
    remainingSeconds: 1500,
    status: 'idle', // 'idle' | 'running' | 'paused' | 'done'
  };

  /** Active setInterval handle (null when not running). */
  let _intervalId = null;

  /**
   * Called by setInterval every 1 000 ms while status === 'running'.
   * Decrements remainingSeconds by 1; when it reaches 0 transitions
   * to 'done' and stops the interval.
   */
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

  /**
   * Transitions idle/paused → running.
   * No-op when already running or done without reset.
   */
  function start() {
    if (_state.status === 'running') return; // req 2.7: no-op if already running
    if (_state.status === 'done')    return; // can't start from done without reset
    _state.status = 'running';
    _intervalId = setInterval(_tick, 1000);
    _render();
  }

  /**
   * Transitions running → paused.
   * Retains the current remaining time.
   */
  function stop() {
    if (_state.status !== 'running') return;
    _state.status = 'paused';
    clearInterval(_intervalId);
    _intervalId = null;
    _render();
  }

  /**
   * Transitions any state → idle.
   * Resets remainingSeconds to 1500 (25:00).
   */
  function reset() {
    if (_intervalId !== null) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
    _state.remainingSeconds = 1500;
    _state.status = 'idle';
    _render();
  }

  /**
   * Cached DOM references, populated during init.
   */
  let _dom = {
    display:    null,
    btnStart:   null,
    btnStop:    null,
    btnReset:   null,
    doneBanner: null,
  };

  /**
   * Re-draws the timer widget from current in-memory state.
   */
  function _render() {
    if (!_dom.display) return; // guard: not yet initialised

    // Update MM:SS display (req 2.1, 2.3, 2.9)
    _dom.display.textContent = formatTimer(_state.remainingSeconds);

    // Disable Start while running (req 2.7, 2.8)
    _dom.btnStart.disabled = (_state.status === 'running');

    // Show/hide completion banner (req 2.6)
    if (_state.status === 'done') {
      _dom.doneBanner.hidden = false;
    } else {
      _dom.doneBanner.hidden = true;
    }
  }

  /**
   * Initialises the Timer widget.
   * Binds button click handlers and renders initial state.
   * @param {HTMLElement} root  — the #widget-timer element
   */
  function init(root) {
    _dom.display    = root.querySelector('#timer-display');
    _dom.btnStart   = root.querySelector('#btn-start');
    _dom.btnStop    = root.querySelector('#btn-stop');
    _dom.btnReset   = root.querySelector('#btn-reset');
    _dom.doneBanner = root.querySelector('#timer-done-banner');

    _dom.btnStart.addEventListener('click', start);
    _dom.btnStop.addEventListener('click', stop);
    _dom.btnReset.addEventListener('click', reset);

    // Render initial state: 25:00, Start enabled, banner hidden (req 2.1)
    _render();
  }

  return { init, start, stop, reset };
})();

/* -------------------------------------------------------------
   Section 5: Tasks Module — pure business-logic functions
   No DOM, no localStorage — these functions only transform arrays.
   ------------------------------------------------------------- */

/**
 * Generates a unique string ID.
 * @returns {string}
 */
function _generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Returns a new task list with the given description appended as a new task.
 * Returns the unchanged list when description is blank or longer than 500 chars.
 *
 * @param {Task[]} list        — current task array (not mutated)
 * @param {string} description — description for the new task
 * @returns {Task[]}
 */
function addTask(list, description) {
  if (isBlank(description) || description.length > 500) {
    return list;
  }
  const newTask = {
    id: _generateId(),
    description: description,
    completed: false,
  };
  return list.concat(newTask);
}

/**
 * Returns a new task list where the task matching `id` has its description
 * replaced with `newDescription`.
 * Returns the unchanged list when newDescription is blank, longer than 500
 * chars, or when no task matches `id`.
 *
 * @param {Task[]} list           — current task array (not mutated)
 * @param {string} id             — id of the task to update
 * @param {string} newDescription — replacement description
 * @returns {Task[]}
 */
function editTask(list, id, newDescription) {
  if (isBlank(newDescription) || newDescription.length > 500) {
    return list;
  }
  return list.map(function (task) {
    if (task.id === id) {
      return { id: task.id, description: newDescription, completed: task.completed };
    }
    return task;
  });
}

/**
 * Returns a new task list with the task matching `id` removed.
 * If no task matches, the list is returned unchanged.
 *
 * @param {Task[]} list — current task array (not mutated)
 * @param {string} id  — id of the task to remove
 * @returns {Task[]}
 */
function deleteTask(list, id) {
  return list.filter(function (task) {
    return task.id !== id;
  });
}

/**
 * Returns a new task list where the task matching `id` has its `completed`
 * boolean flipped.
 * If no task matches, the list is returned unchanged.
 *
 * @param {Task[]} list — current task array (not mutated)
 * @param {string} id  — id of the task to toggle
 * @returns {Task[]}
 */
function toggleTask(list, id) {
  return list.map(function (task) {
    if (task.id === id) {
      return { id: task.id, description: task.description, completed: !task.completed };
    }
    return task;
  });
}

/* -------------------------------------------------------------
   Section 5 (continued): Tasks Module — DOM / init
   ------------------------------------------------------------- */

const TasksModule = (function () {
  /** In-memory task array; loaded from storage on init. */
  let _tasks = [];

  /**
   * Renders the entire task list from _tasks into the <ul> element.
   * @param {HTMLUListElement} ul
   */
  function _renderList(ul) {
    ul.innerHTML = '';

    _tasks.forEach(function (task) {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.completed ? ' completed' : '');
      li.dataset.id = task.id;

      // Checkbox toggle — Req 3.6
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', 'Mark task complete');
      checkbox.addEventListener('change', function () {
        _tasks = toggleTask(_tasks, task.id);
        StorageModule.saveTasks(_tasks);
        _renderList(ul);
      });

      // Description span
      const span = document.createElement('span');
      span.className = 'task-description';
      span.textContent = task.description;

      // Action buttons container
      const actions = document.createElement('div');
      actions.className = 'task-actions';

      // Edit button — Req 3.3
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn-edit';
      btnEdit.textContent = 'Edit';
      btnEdit.type = 'button';
      btnEdit.addEventListener('click', function () {
        _activateEditMode(li, task, ul);
      });

      // Delete button — Req 3.7
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn-delete';
      btnDelete.textContent = 'Delete';
      btnDelete.type = 'button';
      btnDelete.addEventListener('click', function () {
        _tasks = deleteTask(_tasks, task.id);
        StorageModule.saveTasks(_tasks);
        _renderList(ul);
      });

      actions.appendChild(btnEdit);
      actions.appendChild(btnDelete);

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(actions);

      ul.appendChild(li);
    });
  }

  /**
   * Replaces the description span and action buttons with an inline edit
   * form containing a pre-filled input, Confirm, and Cancel buttons.
   * Req 3.3: pre-populate existing description and focus the edit input.
   * Req 3.5: blank edit rejected, original description preserved.
   * Req 3.13: cancel restores original display.
   *
   * @param {HTMLLIElement} li    — the task item element
   * @param {Task}          task  — current task data snapshot
   * @param {HTMLUListElement} ul — the list container (for re-render)
   */
  function _activateEditMode(li, task, ul) {
    // Remove existing span and actions
    const existingSpan    = li.querySelector('.task-description');
    const existingActions = li.querySelector('.task-actions');
    if (existingSpan)    li.removeChild(existingSpan);
    if (existingActions) li.removeChild(existingActions);

    // Build inline edit form
    const editForm = document.createElement('div');
    editForm.className = 'task-edit-form';

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.value = task.description;  // Req 3.3: pre-populated

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

    // Req 3.3: focus the edit input
    editInput.focus();

    // Confirm: validate, persist, re-render — Req 3.4, 3.5
    btnConfirm.addEventListener('click', function () {
      const newDesc = editInput.value;
      if (isBlank(newDesc) || newDesc.length > 500) {
        // Req 3.5: reject blank edit; keep focus on input
        editInput.focus();
        return;
      }
      _tasks = editTask(_tasks, task.id, newDesc);
      StorageModule.saveTasks(_tasks);
      _renderList(ul);
    });

    // Cancel: discard changes and restore — Req 3.13
    btnCancel.addEventListener('click', function () {
      _renderList(ul);
    });
  }

  /**
   * Initialises the Tasks widget.
   * Loads persisted tasks, renders the list, and binds the add-task form.
   * @param {HTMLElement} root — the #widget-tasks element
   */
  function init(root) {
    // Req 3.9: load saved tasks on init; Req 3.10: empty storage → empty list, no error
    _tasks = StorageModule.loadTasks();

    // Locate DOM elements inside the widget root
    const form     = root.querySelector('.task-add-form');
    const addInput = form.querySelector('input[type="text"]');
    const errorEl  = root.querySelector('.task-error');
    const ul       = root.querySelector('.task-list');

    // Initial render
    _renderList(ul);

    // Bind add-task form submit — Req 3.1, 3.2, 3.12
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const desc = addInput.value;

      // Clear any previous error
      errorEl.textContent = '';

      // Req 3.12: >500 chars → reject with inline error
      if (desc.length > 500) {
        errorEl.textContent = 'Task description must be 500 characters or fewer.';
        return;
      }

      // Req 3.2: blank → retain focus, no task added
      if (isBlank(desc)) {
        addInput.focus();
        return;
      }

      // Valid: add, persist, re-render, clear input — Req 3.1, 3.8
      _tasks = addTask(_tasks, desc);
      StorageModule.saveTasks(_tasks);
      _renderList(ul);
      addInput.value = '';
      addInput.focus();
    });
  }

  return { init };
})();

/* -------------------------------------------------------------
   Section 6: Links Module — pure business-logic functions
   No DOM, no localStorage — these functions only transform arrays.
   ------------------------------------------------------------- */

/**
 * Returns a new links array with a new link appended.
 * Rejects (returns unchanged array) when:
 *   - label is blank or longer than 100 chars  (req 4.1, 4.2)
 *   - url fails isValidURL check               (req 4.1, 4.2, 4.3)
 *   - links.length >= 50                        (req 4.10)
 *
 * @param {Link[]} links  — current link array (not mutated)
 * @param {string} label  — display label for the link
 * @param {string} url    — URL for the link (must start with http:// or https://)
 * @returns {Link[]}
 */
function addLink(links, label, url) {
  if (isBlank(label) || label.length > 100) {
    return links;
  }
  if (!isValidURL(url)) {
    return links;
  }
  if (links.length >= 50) {
    return links;
  }
  const newLink = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    label: label,
    url: url,
  };
  return links.concat(newLink);
}

/**
 * Returns a new links array with the link matching `id` removed.
 * If no link matches, the array is returned unchanged.
 *
 * @param {Link[]} links — current link array (not mutated)
 * @param {string} id    — id of the link to remove
 * @returns {Link[]}
 */
function deleteLink(links, id) {
  return links.filter(function (link) {
    return link.id !== id;
  });
}

/* -------------------------------------------------------------
   Section 6 (continued): Links Module — DOM + init
   Renders stored links and binds the add-link form.
   ------------------------------------------------------------- */

const LinksModule = (function () {
  /** In-memory link collection (mirrors tld_links in localStorage). */
  let _links = [];

  /**
   * Cached DOM references, populated during init.
   */
  let _dom = {
    root:           null,
    errorBanner:    null, // .links-error-banner  — corrupt-data message
    saveError:      null, // .links-save-error    — quota / write-failure message
    linkList:       null, // .link-list           — container for link entries
    form:           null, // .link-add-form       — the add-link <form>
    labelInput:     null, // #link-label-input
    urlInput:       null, // #link-url-input
    labelError:     null, // #link-label-error    — per-field inline error
    urlError:       null, // #link-url-error      — per-field inline error
  };

  /* ---- Internal helpers ---- */

  /**
   * Shows `msg` in the given element and marks it visible (removes hidden).
   * @param {HTMLElement} el
   * @param {string}      msg
   */
  function _showError(el, msg) {
    el.textContent = msg;
    el.hidden = false;
  }

  /**
   * Clears and hides the given element.
   * @param {HTMLElement} el
   */
  function _hideError(el) {
    el.textContent = '';
    el.hidden = true;
  }

  /**
   * Re-renders the link list area from the current _links array.
   * Requirement 4.4: each link opens in a new tab.
   * Requirement 4.8: empty collection → empty panel, no error.
   */
  function _renderLinks() {
    const list = _dom.linkList;
    // Clear previous entries
    list.innerHTML = '';

    _links.forEach(function (link) {
      // Outer wrapper
      const entry = document.createElement('div');
      entry.className = 'link-entry';

      // The clickable anchor styled as a pill button
      const anchor = document.createElement('a');
      anchor.href             = link.url;
      anchor.textContent      = link.label;
      anchor.className        = 'link-btn';
      anchor.target           = '_blank';                // Req 4.4
      anchor.rel              = 'noopener noreferrer';   // Req 4.4
      anchor.setAttribute('title', link.url);

      // Delete button beside the link
      const delBtn = document.createElement('button');
      delBtn.type        = 'button';
      delBtn.className   = 'btn-delete-link';
      delBtn.textContent = '✕';
      delBtn.setAttribute('aria-label', 'Delete link: ' + link.label);

      delBtn.addEventListener('click', function () {
        _links = deleteLink(_links, link.id);
        const result = StorageModule.saveLinks(_links);
        if (!result.ok) {
          // Req 4.6: write failure → show save-error (delete still applied in memory)
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

  /**
   * Validates the add-link form fields.
   * Shows/hides per-field inline errors.
   * Returns true if all fields pass, false otherwise.
   * Requirements 4.2, 4.3, 4.10.
   */
  function _validateForm() {
    let valid = true;
    const label = _dom.labelInput.value;
    const url   = _dom.urlInput.value;

    // Clear previous errors
    _hideError(_dom.labelError);
    _hideError(_dom.urlError);
    _dom.labelInput.classList.remove('input-error');
    _dom.urlInput.classList.remove('input-error');

    // Req 4.10 — 50-link limit takes priority (shown as label-area error)
    if (_links.length >= 50) {
      _showError(_dom.labelError,
        'Maximum of 50 links reached. Delete a link to add a new one.');
      _dom.labelInput.classList.add('input-error');
      valid = false;
      // No point validating individual fields; return early.
      return valid;
    }

    // Req 4.2 — empty label
    if (isBlank(label)) {
      _showError(_dom.labelError, 'Label is required.');
      _dom.labelInput.classList.add('input-error');
      valid = false;
    }

    // Req 4.2 — empty URL
    if (isBlank(url)) {
      _showError(_dom.urlError, 'URL is required.');
      _dom.urlInput.classList.add('input-error');
      valid = false;
    } else if (!isValidURL(url)) {
      // Req 4.3 — invalid scheme
      _showError(_dom.urlError,
        'URL must begin with http:// or https://.');
      _dom.urlInput.classList.add('input-error');
      valid = false;
    }

    return valid;
  }

  /* ---- Public API ---- */

  /**
   * Initialises the Links widget.
   * Loads persisted data, registers the corrupt-data callback,
   * renders initial state, and binds the add-link form.
   * @param {HTMLElement} root  — the #widget-links element
   */
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

    // Hide error elements initially (they start hidden in HTML too,
    // but guard here so JS-rendered state is always clean).
    _dom.errorBanner.hidden = true;
    _dom.saveError.hidden   = true;
    _dom.labelError.hidden  = true;
    _dom.urlError.hidden    = true;

    // Req 4.9 — register corrupt-data callback BEFORE loading
    StorageModule.registerOnCorruptLinks(function () {
      _showError(_dom.errorBanner,
        'Saved links could not be loaded (data was corrupted). Starting with an empty list.');
    });

    // Req 4.7 / 4.8 — load stored links; on missing data get []
    _links = StorageModule.loadLinks();

    // Render whatever we loaded (may be empty — Req 4.8)
    _renderLinks();

    // Bind add-link form submit (Req 4.1–4.3, 4.6, 4.10, 5.2, 5.3)
    _dom.form.addEventListener('submit', function (e) {
      e.preventDefault();
      _hideError(_dom.saveError);

      if (!_validateForm()) {
        return; // form has inline errors; stay put
      }

      const label = _dom.labelInput.value.trim();
      const url   = _dom.urlInput.value.trim();

      const newLinks = addLink(_links, label, url);

      // addLink returns the unchanged array when validation fails internally;
      // we already validated above so this branch means 50-link limit hit again
      // (race condition guard).
      if (newLinks === _links) {
        _showError(_dom.labelError,
          'Maximum of 50 links reached. Delete a link to add a new one.');
        return;
      }

      // Try to persist first; on failure show error but still update in-memory
      // so the UI reflects the add (the user is warned the write failed).
      const result = StorageModule.saveLinks(newLinks);
      if (!result.ok) {
        // Req 4.6
        _showError(_dom.saveError, 'Link could not be saved permanently.');
        // Fall through — still render the link in-memory
      }

      _links = newLinks;
      _renderLinks();

      // Clear form inputs on success
      _dom.labelInput.value = '';
      _dom.urlInput.value   = '';
      _dom.labelInput.focus();
    });
  }

  return { init };
})();

/* -------------------------------------------------------------
   Section 7: Bootstrap — DOMContentLoaded handler
   Requirements 6.1, 6.9
   ------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', function () {
  /**
   * Each entry maps a module to its widget root element ID.
   * Modules are initialised in the order listed here.
   */
  var modules = [
    { name: 'GreetingModule', module: GreetingModule, rootId: 'widget-greeting' },
    { name: 'TimerModule',    module: TimerModule,    rootId: 'widget-timer'    },
    { name: 'TasksModule',    module: TasksModule,    rootId: 'widget-tasks'    },
    { name: 'LinksModule',    module: LinksModule,    rootId: 'widget-links'    },
  ];

  modules.forEach(function (entry) {
    // Per-widget try/catch so one failure never blocks the others (Req 6.9).
    try {
      var root = document.getElementById(entry.rootId);
      entry.module.init(root);
    } catch (err) {
      console.error(entry.name + ' failed to initialise:', err);
      // Show a minimal fallback message in the widget's root element (Req 6.9).
      // A null root means the element is missing from the page — guard for that too.
      var fallbackRoot = document.getElementById(entry.rootId);
      if (fallbackRoot) {
        fallbackRoot.textContent = 'Could not load widget';
      }
    }
  });
});
