# Implementation Plan: To-Do List Life Dashboard

## Overview

Implement a single-page, client-side productivity dashboard in plain HTML, one CSS file (`css/style.css`), and one JavaScript file (`js/app.js`). No build step, no frameworks. The app contains four widgets — Greeting, Focus Timer, To-Do List, and Quick Links — each implemented as a self-contained module section inside `js/app.js`. All state is persisted in `localStorage`.

## Tasks

- [x] 1. Scaffold static files and page structure
  - Create `index.html` with the four widget root elements: `#widget-greeting`, `#widget-timer`, `#widget-tasks`, `#widget-links`
  - Add `<link rel="stylesheet" href="css/style.css">` in `<head>` and `<script src="js/app.js">` before `</body>`
  - Create `css/style.css` as an empty file and `js/app.js` as an empty file
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. Implement CSS layout and visual design
  - [x] 2.1 Write the responsive grid layout
    - Apply a CSS Grid or Flexbox layout to the four widgets
    - At viewport ≥ 768 px: at least 2-column grid; below 768 px: single-column, each widget 100 % wide
    - Use a `@media` query so the transition requires no page reload
    - Set `font-size` ≥ 16 px on `body`; ensure text/background color contrast meets WCAG 2.1 AA (4.5:1)
    - _Requirements: 6.4, 6.5, 6.6, 6.7, 6.8_
  - [x] 2.2 Style all four widgets
    - Style `#widget-greeting`, `#widget-timer`, `#widget-tasks`, `#widget-links` with card-style containers
    - Style the timer display, task list items (complete/incomplete visual distinction), and link buttons
    - Ensure the CSS grid handles a missing widget root without breaking the layout (empty cells collapse gracefully)
    - _Requirements: 3.6, 6.1, 6.9_

- [x] 3. Implement utility functions (Section 1 of `js/app.js`)
  - [x] 3.1 Write all pure utility functions
    - `formatTime(date)` → HH:MM zero-padded 24-hour string
    - `formatDate(date)` → `"<Weekday>, <DD> <Month> <YYYY>"` string
    - `getGreeting(hour)` → one of four greeting strings using thresholds [5,12), [12,18), [18,21), night otherwise
    - `formatTimer(totalSeconds)` → MM:SS zero-padded for input in [0,1500]
    - `isValidURL(url)` → true iff starts with `http://` or `https://`
    - `isBlank(str)` → true iff empty or whitespace-only
    - `serializeTasks(tasks)` / `deserializeTasks(json)` and `serializeLinks(links)` / `deserializeLinks(json)`
    - _Requirements: 1.1, 1.2, 1.4–1.7, 2.1, 2.9, 4.3, 5.5, 5.6_
  - [ ]* 3.2 Write property test for `formatTime` (Property 1)
    - **Property 1: Time formatting produces valid HH:MM**
    - Use `fc.date()` to generate arbitrary dates; assert output matches `/^\d{2}:\d{2}$/` and digits match `getHours()`/`getMinutes()`
    - **Validates: Requirements 1.1**
  - [ ]* 3.3 Write property test for `formatDate` (Property 2)
    - **Property 2: Date formatting includes all required components**
    - Use `fc.date()`; assert output contains full weekday, numeric day, full month name, and four-digit year
    - **Validates: Requirements 1.2**
  - [ ]* 3.4 Write property test for `getGreeting` (Property 3)
    - **Property 3: Greeting covers every hour without gaps or overlaps**
    - Use `fc.integer({min:0, max:23})`; assert exactly one of the four greeting strings is returned and threshold mapping is correct
    - **Validates: Requirements 1.4, 1.5, 1.6, 1.7**
  - [ ]* 3.5 Write property test for `formatTimer` (Property 4)
    - **Property 4: Timer format produces valid MM:SS within bounds**
    - Use `fc.integer({min:0, max:1500})`; assert output matches `/^\d{2}:\d{2}$/`, minutes in [0,25], seconds in [0,59]
    - **Validates: Requirements 2.1, 2.9**
  - [ ]* 3.6 Write property test for `isValidURL` (Property 12)
    - **Property 12: Valid URLs pass, invalid URLs fail**
    - Use `fc.webUrl()` for valid cases and `fc.string()` filtered to exclude `http://`/`https://` prefix for invalid cases
    - **Validates: Requirements 4.3**
  - [ ]* 3.7 Write property tests for serialization round-trips (Properties 15 and 16)
    - **Property 15: Task collection serialization round-trip**
    - **Property 16: Link collection serialization round-trip**
    - Use `fc.array(taskArb)` and `fc.array(linkArb)`; assert all field values are identical after serialize→deserialize
    - **Validates: Requirements 5.4, 5.5, 5.6**

- [x] 4. Implement the Storage module (Section 2 of `js/app.js`)
  - [x] 4.1 Write `StorageModule`
    - `loadTasks()`: reads `tld_tasks`, returns `[]` on missing or corrupt data, logs `console.error` identifying the key on corruption
    - `saveTasks(tasks)`: writes serialized tasks to `tld_tasks`
    - `loadLinks()`: reads `tld_links`, returns `[]` on missing or corrupt, logs `console.error`, invokes a registered `onCorruptLinks` callback
    - `saveLinks(links)`: writes serialized links to `tld_links`, returns `{ ok: false }` and catches exceptions (quota exceeded)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7_

- [x] 5. Implement the Greeting module (Section 3 of `js/app.js`)
  - [x] 5.1 Write `GreetingModule.init(root)`
    - Query `.greeting-time`, `.greeting-date`, `.greeting-message` inside `root`
    - Call `_render(root, new Date())` immediately on init
    - Set a `setInterval` at 60 000 ms; on each tick call `_render(root, new Date())` so threshold crossings are detected automatically
    - Add the matching HTML structure to `#widget-greeting` in `index.html`
    - _Requirements: 1.1, 1.2, 1.3, 1.4–1.8_

- [x] 6. Implement the Timer module (Section 4 of `js/app.js`)
  - [x] 6.1 Write `TimerModule.init(root)` and state machine
    - In-memory state: `{ remainingSeconds: 1500, status: 'idle' }` (statuses: `idle`, `running`, `paused`, `done`)
    - Transitions: `start()` (idle/paused → running, no-op if running), `stop()` (running → paused), `reset()` (any → idle, remainingSeconds = 1500)
    - `_tick()` decrements `remainingSeconds` by 1 every 1 000 ms; at 0 sets `status = 'done'` and stops interval
    - `_render()` updates the MM:SS display, disables Start when running, shows `#timer-done-banner` when done
    - Bind `#btn-start`, `#btn-stop`, `#btn-reset` click handlers; add matching HTML to `#widget-timer`
    - _Requirements: 2.1–2.9_
  - [ ]* 6.2 Write property test for timer decrement (Property 5)
    - **Property 5: Timer decrement is bounded at zero**
    - Use `fc.integer({min:0, max:1500})`; for s > 0 assert tick produces s-1; for s = 0 assert tick produces 0
    - **Validates: Requirements 2.2, 2.3, 2.6**

- [ ] 7. Checkpoint — Utilities, Storage, Greeting, Timer
  - Ensure all property tests written so far pass. Ask the user if any questions arise before continuing.

- [x] 8. Implement the Tasks module (Section 5 of `js/app.js`)
  - [x] 8.1 Write pure task business-logic functions
    - `addTask(list, description)`: validates non-blank and length ≤ 500; returns new list with appended task `{ id, description, completed: false }`
    - `editTask(list, id, newDescription)`: validates non-blank and length ≤ 500; returns updated list
    - `deleteTask(list, id)`: returns list without the item matching `id`
    - `toggleTask(list, id)`: flips `completed` for the matching item; returns updated list
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 3.7_
  - [ ]* 8.2 Write property test for `addTask` (Property 6)
    - **Property 6: Adding a valid task grows the list by one**
    - Use `fc.array(taskArb)` and non-blank `fc.string({minLength:1, maxLength:500})`; assert length is `list.length + 1` and new item has correct description and `completed: false`
    - **Validates: Requirements 3.1**
  - [ ]* 8.3 Write property test for blank task rejection (Property 7)
    - **Property 7: Blank or whitespace task descriptions are always rejected**
    - Use whitespace-only strings; assert list length unchanged
    - **Validates: Requirements 3.2**
  - [ ]* 8.4 Write property test for `editTask` (Property 8)
    - **Property 8: Edit with valid description updates only the targeted task**
    - Use `fc.array(taskArb, {minLength:1})` and valid replacement; assert only the targeted task changes
    - **Validates: Requirements 3.4**
  - [ ]* 8.5 Write property test for blank edit rejection (Property 9)
    - **Property 9: Edit with blank description is rejected**
    - Use whitespace-only replacement; assert targeted task description unchanged
    - **Validates: Requirements 3.5**
  - [ ]* 8.6 Write property test for toggle round-trip (Property 10)
    - **Property 10: Completion toggle is its own inverse**
    - Use `taskArb`; assert `toggleTask(toggleTask(t)).completed === t.completed` and single toggle flips value
    - **Validates: Requirements 3.6**
  - [ ]* 8.7 Write property test for `deleteTask` (Property 11)
    - **Property 11: Deleting a task removes it and only it**
    - Use `fc.array(taskArb, {minLength:1})`; assert deleted id absent and length is `list.length - 1`
    - **Validates: Requirements 3.7**
  - [x] 8.8 Write `TasksModule.init(root)` and DOM rendering
    - Load tasks from `StorageModule.loadTasks()` into in-memory array on init
    - Render each task as a `<li>`: checkbox toggle, description `<span>`, Edit button, Delete button
    - Bind add-task form submit: validate, call `addTask`, persist via `StorageModule.saveTasks`, re-render, clear input; reject blank (retain focus); reject > 500 chars with inline error
    - Edit mode: replace `<span>` with pre-filled `<input>` + Confirm/Cancel buttons; Confirm calls `editTask` + persist + re-render; Cancel restores original display
    - Delete: call `deleteTask` + persist + re-render
    - Toggle: call `toggleTask` + persist + re-render; apply distinct visual style to completed items
    - On load, if no data in storage, render empty list with no error
    - Support at least 100 tasks with scrollable container (no text clipping)
    - Add matching HTML structure to `#widget-tasks` in `index.html`
    - _Requirements: 3.1–3.13, 5.1, 5.3, 5.8_

- [x] 9. Implement the Links module (Section 6 of `js/app.js`)
  - [x] 9.1 Write pure link business-logic functions
    - `addLink(links, label, url)`: validates label non-empty and ≤ 100 chars, URL via `isValidURL`, rejects if `links.length >= 50`; returns new links array
    - `deleteLink(links, id)`: returns links array without the item matching `id`
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.10_
  - [ ]* 9.2 Write property test for `addLink` (Property 13)
    - **Property 13: Adding a valid link grows the collection**
    - Use `fc.array(linkArb, {maxLength:49})` and a valid link; assert length is `links.length + 1`
    - **Validates: Requirements 4.1**
  - [ ]* 9.3 Write property test for `deleteLink` (Property 14)
    - **Property 14: Deleting a link removes it and only it**
    - Use `fc.array(linkArb, {minLength:1})`; assert deleted id absent and length is `links.length - 1`
    - **Validates: Requirements 4.5**
  - [x] 9.4 Write `LinksModule.init(root)` and DOM rendering
    - Load links from `StorageModule.loadLinks()` on init; register `onCorruptLinks` callback to show error banner in widget
    - Render each link as an `<a>` button with `target="_blank" rel="noopener noreferrer"` and a Delete button beside it
    - Bind add-link form submit: validate label and URL with per-field inline errors; call `addLink`; on success `StorageModule.saveLinks` and re-render; on `{ ok: false }` from storage show save-failure inline error; reject when 50-link limit is reached with appropriate error message
    - On load with no data, render empty panel with no error
    - Add matching HTML structure to `#widget-links` in `index.html`
    - _Requirements: 4.1–4.10, 5.2, 5.3, 5.8_

- [x] 10. Write the Bootstrap section and wire all modules (Section 7 of `js/app.js`)
  - [x] 10.1 Wire modules in `DOMContentLoaded` handler
    - Inside a `DOMContentLoaded` listener, wrap each `Module.init(rootElement)` call in a `try/catch`; on error display a minimal "Could not load widget" message in that widget's root element and continue initialising the remaining modules
    - Call `GreetingModule.init`, `TimerModule.init`, `TasksModule.init`, `LinksModule.init` in sequence
    - _Requirements: 6.1, 6.9_

- [~] 11. Final checkpoint — Full integration
  - Ensure all tests pass (property-based and example-based). Open `index.html` directly in a browser (no server needed) and verify all four widgets render and function correctly. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build
- The entire application runs from the filesystem (`file://`) with no server or build step
- Property tests require installing `vitest` and `fast-check` as dev dependencies in a sibling `test/` directory; they test the pure functions extracted from `js/app.js` (or a parallel test-friendly module)
- Each property test must include the comment `// Feature: todo-life-dashboard, Property N: <property text>` per the design's testing strategy
- Checkpoints (tasks 7 and 11) are for validation only and do not produce deliverable code

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "5.1", "6.1", "8.1", "9.1"] },
    { "id": 3, "tasks": ["6.2", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "9.2", "9.3", "8.8", "9.4"] },
    { "id": 4, "tasks": ["10.1"] }
  ]
}
```
