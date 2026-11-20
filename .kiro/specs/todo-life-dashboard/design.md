# Design Document

## Overview

The To-Do List Life Dashboard is a single-page, client-side productivity application delivered as a static website (or optional browser extension). It has no backend; all state lives in the browser's `localStorage`. The app is composed of four independently operating widgets — Greeting, Focus Timer, To-Do List, and Quick Links — each implemented as a self-contained JavaScript module that communicates with a shared persistence layer.

The technology constraints are intentional: plain HTML, one CSS file (`css/style.css`), one JS file (`js/app.js`), no build step, no frameworks. This means the architecture relies on the Module Pattern (IIFE/closures) and DOM events rather than component frameworks or reactive state management.

---

## Architecture

### High-Level Structure

```
index.html
├── <head>
│   └── <link rel="stylesheet" href="css/style.css">
└── <body>
    ├── #widget-greeting
    ├── #widget-timer
    ├── #widget-tasks
    ├── #widget-links
    └── <script src="js/app.js">
```

`js/app.js` is a single concatenated file containing logically separated sections:

```
js/app.js
├── [Section 1] Utility functions  (pure, no DOM/IO)
├── [Section 2] Storage module     (localStorage read/write)
├── [Section 3] Greeting module    (time/date display)
├── [Section 4] Timer module       (countdown logic + DOM)
├── [Section 5] Tasks module       (CRUD + DOM)
├── [Section 6] Links module       (CRUD + DOM)
└── [Section 7] Bootstrap          (DOMContentLoaded initializer)
```

Each module exposes a single `init(rootElement)` function. The bootstrap section calls all four `init` functions after the DOM is ready.

### Data Flow

```
User Interaction
      │
      ▼
  DOM Event Handler (widget module)
      │
      ├─► Pure business logic function (transform state)
      │
      ├─► Storage module (persist new state)
      │
      └─► Render function (re-draw DOM from new state)
```

State is never held in the DOM. Each module keeps an in-memory array (or object) as its authoritative state, mutates it on user action, persists it, then re-renders from the in-memory state.

---

## Components and Interfaces

### 1. Utility Functions

Pure functions with no side effects. Used by multiple modules.

```
formatTime(date: Date) → string
  Returns HH:MM (zero-padded, 24-hour).

formatDate(date: Date) → string
  Returns "<Weekday>, <DD> <Month> <YYYY>" (e.g. "Monday, 16 November 2026").

getGreeting(hour: number) → string
  hour ∈ [0,23]
  Returns one of: "Good Morning" | "Good Afternoon" | "Good Evening" | "Good Night"
  Thresholds: [5,12) → Morning, [12,18) → Afternoon, [18,21) → Evening, [0,5) | [21,24) → Night

formatTimer(totalSeconds: number) → string
  totalSeconds ∈ [0,1500]
  Returns MM:SS (zero-padded).

isValidURL(url: string) → boolean
  Returns true iff url starts with "http://" or "https://".

isBlank(str: string) → boolean
  Returns true iff str is empty or contains only whitespace.

serializeTasks(tasks: Task[]) → string
  Returns JSON.stringify of the tasks array.

deserializeTasks(json: string) → Task[] | null
  Returns parsed array or null on parse failure / non-array.

serializeLinks(links: Link[]) → string
  Returns JSON.stringify of the links array.

deserializeLinks(json: string) → Link[] | null
  Returns parsed array or null on parse failure / non-array.
```

### 2. Storage Module

Wraps `localStorage` access behind a typed interface.

```
StorageModule.loadTasks() → Task[]
  Reads "tld_tasks". Returns [] on missing or corrupt data; logs console.error on corrupt.

StorageModule.saveTasks(tasks: Task[]) → void
  Writes serialized tasks to "tld_tasks".

StorageModule.loadLinks() → Link[]
  Reads "tld_links". Returns [] on missing or corrupt data; logs console.error on corrupt;
  calls onCorruptLinks callback to display error message in the Links widget.

StorageModule.saveLinks(links: Link[]) → { ok: boolean }
  Writes serialized links to "tld_links". Returns { ok: false } on exception, triggering
  the caller to display a save-failure error message.
```

### 3. Greeting Module

```
GreetingModule.init(root: HTMLElement) → void
  Renders time, date, and greeting immediately.
  Schedules a setInterval at 60 000 ms to re-render on each tick.
  On each tick, re-computes greeting from current hour so threshold crossings are detected.
```

Internal render function:

```
_render(root, now: Date) → void
  Updates root.querySelector('.greeting-time').textContent   ← formatTime(now)
  Updates root.querySelector('.greeting-date').textContent   ← formatDate(now)
  Updates root.querySelector('.greeting-message').textContent ← getGreeting(now.getHours())
```

### 4. Timer Module

State object (in-memory):

```
{ remainingSeconds: 1500, status: 'idle' | 'running' | 'paused' | 'done' }
```

Transitions:

```
start()   idle | paused → running  (no-op if already running)
stop()    running → paused
reset()   any → idle, remainingSeconds = 1500
_tick()   called by setInterval every 1 000 ms
          running: remainingSeconds -= 1; if 0 → status = 'done'
```

DOM interface:

```
TimerModule.init(root: HTMLElement) → void
  Binds #btn-start, #btn-stop, #btn-reset click handlers.
  Renders initial state (25:00, Start enabled, Stop/Reset enabled).
  _render() after each state transition.
  On status='done': shows completion indicator (#timer-done-banner).
```

### 5. Tasks Module

State: `Task[]` in-memory, loaded from storage on init.

```
TasksModule.init(root: HTMLElement) → void
  Loads tasks from StorageModule.
  Renders task list.
  Binds add-task form submit.

addTask(description: string) → Task
  Validates: not blank, length ≤ 500. Returns new Task.

editTask(id: string, newDescription: string) → void
  Validates: not blank, length ≤ 500. Updates in-memory + storage + re-renders.

deleteTask(id: string) → void
  Removes from in-memory + storage + re-renders.

toggleTask(id: string) → void
  Flips completed boolean + storage + re-renders.
```

Each `Task` rendered as a `<li>` with:
- Checkbox (completion toggle)
- `<span>` for description (double-click or edit button enters edit mode)
- Edit button → switches span to `<input>` pre-filled with current description + confirm/cancel buttons
- Delete button

### 6. Links Module

State: `Link[]` in-memory, loaded from storage on init. Maximum 50 links.

```
LinksModule.init(root: HTMLElement) → void
  Loads links from StorageModule (shows error if corrupt).
  Renders link buttons.
  Binds add-link form submit.

addLink(label: string, url: string) → Link | ValidationError
  Validates label (non-empty, ≤100 chars) and URL (isValidURL).
  Rejects if list already has 50 items.
  On success: appends to in-memory + storage + re-renders.
  On storage failure: re-renders but shows save-failure banner.

deleteLink(id: string) → void
  Removes from in-memory + storage + re-renders.
```

Each `Link` rendered as:
- `<a>` button that opens the URL in a new tab (`target="_blank" rel="noopener noreferrer"`)
- Delete button beside it

---

## Data Models

### Task

```json
{
  "id": "string (UUID v4 or Date.now() + Math.random() hex)",
  "description": "string (1–500 chars)",
  "completed": false
}
```

Stored as a JSON array under `localStorage["tld_tasks"]`.

### Link

```json
{
  "id": "string",
  "label": "string (1–100 chars)",
  "url": "string (must start with http:// or https://)"
}
```

Stored as a JSON array under `localStorage["tld_links"]`.

### Timer State (in-memory only, never persisted)

```json
{
  "remainingSeconds": 1500,
  "status": "idle | running | paused | done"
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Time formatting produces valid HH:MM

*For any* `Date` object, `formatTime(date)` must return a string matching `/^\d{2}:\d{2}$/` where the two-digit hour equals `date.getHours()` (zero-padded) and the two-digit minute equals `date.getMinutes()` (zero-padded).

**Validates: Requirements 1.1**

---

### Property 2: Date formatting includes all required components

*For any* `Date` object, `formatDate(date)` must return a string that contains the full weekday name, the numeric day of month, the full month name, and the four-digit year corresponding to that date.

**Validates: Requirements 1.2**

---

### Property 3: Greeting covers every hour without gaps or overlaps

*For any* integer hour in [0, 23], `getGreeting(hour)` must return exactly one of `"Good Morning"`, `"Good Afternoon"`, `"Good Evening"`, or `"Good Night"`, and the returned value must correspond to the threshold range that contains that hour ([5,12) → Morning, [12,18) → Afternoon, [18,21) → Evening, otherwise → Night).

**Validates: Requirements 1.4, 1.5, 1.6, 1.7**

---

### Property 4: Timer format produces valid MM:SS within bounds

*For any* integer `s` in [0, 1500], `formatTimer(s)` must return a string matching `/^\d{2}:\d{2}$/` where the minutes component is in [0, 25] and the seconds component is in [0, 59].

**Validates: Requirements 2.1, 2.9**

---

### Property 5: Timer decrement is bounded at zero

*For any* integer `s` in [1, 1500], decrementing the timer by one tick produces `s - 1`; for `s = 0`, the timer remains at `0` (never goes negative).

**Validates: Requirements 2.2, 2.3, 2.6**

---

### Property 6: Adding a valid task grows the list by one

*For any* task list and any non-blank description string of 1–500 characters, `addTask(list, desc)` produces a list whose length is exactly `list.length + 1`, and the new item has the given description and `completed = false`.

**Validates: Requirements 3.1**

---

### Property 7: Blank or whitespace task descriptions are always rejected

*For any* string composed entirely of whitespace (including the empty string), `addTask(list, desc)` leaves the list unchanged (same length, same items).

**Validates: Requirements 3.2**

---

### Property 8: Edit with valid description updates only the targeted task

*For any* task list, any task `id` present in that list, and any valid replacement description, `editTask(list, id, newDesc)` produces a list where the task with that `id` has description equal to `newDesc`, and all other tasks are identical to the originals.

**Validates: Requirements 3.4**

---

### Property 9: Edit with blank description is rejected

*For any* task list, any task `id`, and any whitespace-only replacement string, `editTask(list, id, blank)` leaves the targeted task's description unchanged.

**Validates: Requirements 3.5**

---

### Property 10: Completion toggle is its own inverse (round-trip)

*For any* task `t`, `toggleTask(toggleTask(t)).completed === t.completed`. Equivalently, a single toggle always flips the boolean: `toggleTask(t).completed !== t.completed`.

**Validates: Requirements 3.6**

---

### Property 11: Deleting a task removes it and only it

*For any* task list with at least one task and any `id` present in that list, `deleteTask(list, id)` produces a list that contains no item with that `id`, and whose length is exactly `list.length - 1`.

**Validates: Requirements 3.7**

---

### Property 12: Valid URLs pass, invalid URLs fail

*For any* string that does not start with `"http://"` or `"https://"`, `isValidURL(str)` returns `false`. *For any* string that does start with `"http://"` or `"https://"`, `isValidURL(str)` returns `true`.

**Validates: Requirements 4.3**

---

### Property 13: Adding a valid link grows the collection

*For any* link collection of length < 50 and any link with a non-empty label (≤ 100 chars) and a valid URL, `addLink(links, link)` produces a collection of length `links.length + 1` containing that link.

**Validates: Requirements 4.1**

---

### Property 14: Deleting a link removes it and only it

*For any* link collection with at least one link and any `id` present in that collection, `deleteLink(links, id)` produces a collection not containing that `id` and of length `links.length - 1`.

**Validates: Requirements 4.5**

---

### Property 15: Task collection serialization round-trip

*For any* valid `Task[]`, serializing with `serializeTasks` then deserializing with `deserializeTasks` produces an array where every task is present with identical `id`, `description`, and `completed` values to the original.

**Validates: Requirements 5.4, 5.5**

---

### Property 16: Link collection serialization round-trip

*For any* valid `Link[]`, serializing with `serializeLinks` then deserializing with `deserializeLinks` produces an array where every link is present with identical `id`, `label`, and `url` values to the original.

**Validates: Requirements 5.4, 5.6**

---

## Error Handling

| Scenario | Detection | Response |
|---|---|---|
| Corrupt `tld_tasks` in localStorage | `JSON.parse` throws or result is not an array | Log `console.error("tld_tasks: corrupt data, initializing empty")`, start with `[]` |
| Corrupt `tld_links` in localStorage | Same | Log `console.error`, start with `[]`, render error banner in links widget |
| `localStorage.setItem` throws (quota exceeded) | Catch around `setItem` | Display inline error message: "Link could not be saved permanently." |
| Task description > 500 chars | Checked before `addTask` | Display inline error message beneath input field indicating the 500-character limit |
| Task description blank | `isBlank()` check | Retain focus on input, no task added, no error message needed (input stays ready) |
| Link label empty | `isBlank()` check | Inline error beneath the label field: "Label is required." |
| Link URL empty | `isBlank()` check | Inline error beneath the URL field: "URL is required." |
| Link URL invalid scheme | `isValidURL()` check | Inline error: "URL must begin with http:// or https://." |
| 50-link limit reached | Length check before `addLink` | Inline error: "Maximum of 50 links reached. Delete a link to add a new one." |
| Widget script error | Each module wrapped in try/catch in bootstrap | Remaining modules still initialize; failed widget root shows a minimal "Could not load widget" message; layout grid is not broken (CSS handles empty cells gracefully) |

---

## Testing Strategy

### Approach

The testing strategy uses two complementary layers:

1. **Property-based tests** — verify universal correctness of pure utility and business-logic functions across a large input space
2. **Example-based unit tests** — verify specific interactions, state transitions, and edge cases

Since there is no build step, tests are run with a lightweight test harness (e.g. [fast-check](https://fast-check.dev/) with [Vitest](https://vitest.dev/) or Node's built-in `node:test` + `assert`) applied to the pure-function modules extracted from `js/app.js`.

For property-based testing the library of choice is **fast-check** (JavaScript). Each property test runs a minimum of **100 iterations**.

Each property test is tagged with a comment in the following format:

```
// Feature: todo-life-dashboard, Property N: <property text>
```

---

### Property-Based Tests

Each test maps to one Correctness Property above.

| Test | Property | fast-check Arbitraries |
|---|---|---|
| `formatTime` output format and correctness | P1 | `fc.date()` |
| `formatDate` contains all date components | P2 | `fc.date()` |
| `getGreeting` covers all 24 hours | P3 | `fc.integer({min:0, max:23})` |
| `formatTimer` format and bounds | P4 | `fc.integer({min:0, max:1500})` |
| Timer decrement bounded | P5 | `fc.integer({min:0, max:1500})` |
| Valid task added correctly | P6 | `fc.array(taskArb)`, `fc.string({minLength:1, maxLength:500})` filtered for non-blank |
| Blank task rejected | P7 | `fc.array(taskArb)`, `fc.stringOf(fc.constantFrom(' ','\t','\n'))` |
| Edit updates only target | P8 | `fc.array(taskArb, {minLength:1})`, valid desc |
| Edit with blank rejected | P9 | `fc.array(taskArb, {minLength:1})`, blank string |
| Toggle round-trip | P10 | `taskArb` |
| Delete removes only target | P11 | `fc.array(taskArb, {minLength:1})` |
| URL validation | P12 | `fc.webUrl()` for valid, `fc.string()` filtered for non-http for invalid |
| Add valid link grows collection | P13 | `fc.array(linkArb, {maxLength:49})`, `linkArb` |
| Delete link removes only target | P14 | `fc.array(linkArb, {minLength:1})` |
| Task round-trip | P15 | `fc.array(taskArb)` |
| Link round-trip | P16 | `fc.array(linkArb)` |

---

### Example-Based Unit Tests

- Timer initial state renders "25:00" with Start enabled
- Timer `start → stop` retains remaining seconds
- Timer `start → reset` returns to 1500 s and status "idle"
- Timer ignores second `start` call when already running
- Timer reaching 00:00 sets status "done" and shows completion indicator
- Greeting updates when clock ticks past a threshold (fake timers)
- Task add clears the input field
- Edit mode pre-populates input with current description; cancel restores original
- Task list renders correctly from seeded localStorage (integration smoke)
- Link form shows per-field errors on empty submission
- Link opens in new tab (verifies `target="_blank"`)
- Storage failure on `setItem` shows error banner in links widget
- Corrupt `tld_links` JSON shows error and renders empty list
- Corrupt `tld_tasks` JSON logs error and renders empty list
- 100 tasks render without DOM overflow (count check)
- 50-link limit: 51st add is rejected with correct error message

---

### Layout / Visual Tests

- CSS snapshot tests at viewport widths 320 px, 768 px, 1280 px
- Computed font-size ≥ 16 px for body text
- Color contrast ratios verified against WCAG 2.1 AA (4.5:1) using `color-contrast` npm utility
- Grid holds when one widget's root element is removed from DOM (remaining three fill without gap)
