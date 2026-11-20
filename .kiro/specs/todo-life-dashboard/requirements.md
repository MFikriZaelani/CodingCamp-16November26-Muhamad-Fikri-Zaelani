# Requirements Document

## Introduction

The To-Do List Life Dashboard is a client-side web application built with HTML, CSS, and vanilla JavaScript. It provides a personal productivity hub combining four features on a single page: a time/date greeting, a 25-minute focus timer, a task list, and a quick-links panel. All data is persisted in the browser's Local Storage with no backend server. The app must run in modern browsers (Chrome, Firefox, Edge, Safari) and may also be packaged as a browser extension.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Widget**: The UI section that displays the current time, date, and a time-of-day greeting message.
- **Focus_Timer**: The UI section containing a countdown timer and its control buttons.
- **Task_List**: The UI section that manages the user's to-do items.
- **Quick_Links**: The UI section that manages user-defined shortcut links to external websites.
- **Task**: A single to-do item consisting of a text description and a completion status.
- **Link**: A user-defined record consisting of a display label and a URL.
- **Local_Storage**: The browser's `localStorage` API used as the sole persistence layer.
- **Active_Session**: The period during which the Focus_Timer is counting down.

---

## Requirements

### Requirement 1: Time and Date Greeting

**User Story:** As a user, I want to see the current time, date, and a greeting message when I open the Dashboard, so that I am immediately oriented in my day.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Greeting_Widget SHALL display the current local time in HH:MM format (24-hour clock, no seconds).
2. WHEN the Dashboard loads, THE Greeting_Widget SHALL display the current date including the day of the week, day of the month, month name, and year.
3. WHILE the Dashboard is open, THE Greeting_Widget SHALL update the displayed time every 60 seconds to reflect the current local time.
4. IF the local time is 05:00 or later and before 12:00, THEN THE Greeting_Widget SHALL display the greeting "Good Morning".
5. IF the local time is 12:00 or later and before 18:00, THEN THE Greeting_Widget SHALL display the greeting "Good Afternoon".
6. IF the local time is 18:00 or later and before 21:00, THEN THE Greeting_Widget SHALL display the greeting "Good Evening".
7. IF the local time is 21:00 or later, or before 05:00, THEN THE Greeting_Widget SHALL display the greeting "Good Night".
8. WHILE the Dashboard is open, WHEN the local time crosses a greeting threshold (05:00, 12:00, 18:00, or 21:00), THE Greeting_Widget SHALL update the displayed greeting to match the new time period.

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with Start, Stop, and Reset controls, so that I can time focused work sessions.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Focus_Timer SHALL display an initial countdown value of 25:00 in MM:SS format, with each field always showing two digits.
2. WHEN the user activates the Start control, THE Focus_Timer SHALL begin counting down from the currently displayed time in one-second decrements.
3. WHILE an Active_Session is running, THE Focus_Timer SHALL update the displayed countdown value once per second, within a tolerance of ±100 milliseconds per decrement.
4. WHEN the user activates the Stop control, THE Focus_Timer SHALL pause the countdown and retain the current remaining time in the display.
5. WHEN the user activates the Reset control, THE Focus_Timer SHALL stop any running or paused countdown and reset the displayed value to 25:00.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop counting, display 00:00, and present a visible completion indicator to the user.
7. IF the user activates the Start control while an Active_Session is already running, THEN THE Focus_Timer SHALL ignore the input and continue the current session unchanged.
8. WHILE an Active_Session is running, THE Focus_Timer SHALL disable the Start control to prevent duplicate sessions.
9. THE Focus_Timer SHALL display all countdown values in MM:SS format, with minutes bounded between 00 and 25 and seconds bounded between 00 and 59.

---

### Requirement 3: To-Do List

**User Story:** As a user, I want to add, edit, mark as complete, and delete tasks, so that I can track and manage what I need to do.

#### Acceptance Criteria

1. WHEN the user submits a non-empty task description of 1 to 500 characters via the add-task input, THE Task_List SHALL add a new Task with the provided description and a completion status of incomplete, then clear the add-task input field.
2. IF the user submits an empty or whitespace-only task description, THEN THE Task_List SHALL reject the input and retain focus on the input field.
3. WHEN the user activates the edit control for a Task, THE Task_List SHALL present the existing description pre-populated in an editable field and place input focus on that field.
4. WHEN the user confirms an edit with a non-empty description of 1 to 500 characters, THE Task_List SHALL update the Task's description to the new value.
5. IF the user confirms an edit with an empty or whitespace-only description, THEN THE Task_List SHALL reject the edit and preserve the original description.
6. WHEN the user toggles the completion control for a Task, THE Task_List SHALL change the Task's completion status from incomplete to complete, or from complete to incomplete, and render the Task with a visual appearance that distinguishes it from Tasks of the opposite status.
7. WHEN the user activates the delete control for a Task, THE Task_List SHALL permanently remove that Task from the list.
8. WHEN any Task is added, edited, deleted, or its completion status changes, THE Task_List SHALL write the full current task collection to Local_Storage.
9. WHEN the Dashboard loads, THE Task_List SHALL read the task collection from Local_Storage and render all previously saved Tasks.
10. IF no task data exists in Local_Storage on load, THEN THE Task_List SHALL display an empty list with no error.
11. THE Task_List SHALL support storing and displaying at least 100 Tasks such that all Task items remain individually visible, scrollable, and free from text clipping or overlap.
12. IF the user submits a task description exceeding 500 characters, THEN THE Task_List SHALL reject the input and display an error message indicating the character limit.
13. WHEN the user cancels an in-progress edit, THE Task_List SHALL discard the unsaved changes and restore the Task's original description.

---

### Requirement 4: Quick Links

**User Story:** As a user, I want to save and open shortcut links to my favorite websites, so that I can navigate to them quickly from the Dashboard.

#### Acceptance Criteria

1. WHEN the user submits a Link record with a non-empty label of at most 100 characters and a URL that starts with "http://" or "https://", THE Quick_Links SHALL add the Link and display it as a clickable button.
2. IF the user submits a Link record with an empty label or an empty URL, THEN THE Quick_Links SHALL reject the submission and display a distinct inline error message beneath each empty field indicating that field is required.
3. IF the user submits a URL that does not start with "http://" or "https://", THEN THE Quick_Links SHALL reject the submission and display an error message stating the URL must begin with "http://" or "https://".
4. WHEN the user activates a Link button, THE Quick_Links SHALL open the associated URL in a new browser tab.
5. WHEN the user activates the delete control for a Link, THE Quick_Links SHALL permanently remove that Link.
6. WHEN any Link is added or deleted, THE Quick_Links SHALL write the full current link collection to Local_Storage; IF the write operation fails, THEN THE Quick_Links SHALL display an error message indicating the link could not be saved persistently.
7. WHEN the Dashboard loads, THE Quick_Links SHALL read the link collection from Local_Storage and render all previously saved Links.
8. IF no link data exists in Local_Storage on load, THEN THE Quick_Links SHALL display an empty links panel with no error.
9. IF the data read from Local_Storage on load cannot be parsed as a valid link collection, THEN THE Quick_Links SHALL discard the corrupted data, display an empty links panel, and display an error message indicating saved links could not be loaded.
10. IF the user attempts to add a Link when the collection already contains 50 Links, THEN THE Quick_Links SHALL reject the submission and display an error message indicating the maximum number of links has been reached.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my tasks and links to survive page refreshes and browser restarts, so that I do not lose my data between sessions.

#### Acceptance Criteria

1. THE Dashboard SHALL store all Task data under a single, dedicated Local_Storage key `tld_tasks`.
2. THE Dashboard SHALL store all Link data under a single, dedicated Local_Storage key `tld_links`.
3. WHEN any Task or Link is created, updated, or deleted, THE Dashboard SHALL immediately serialize the full current collection to its corresponding Local_Storage key as a JSON string.
4. WHEN the Dashboard initializes on page load, THE Dashboard SHALL read the Local_Storage keys `tld_tasks` and `tld_links`, deserialize the JSON, and restore every Task and Link that was previously persisted, so that the restored collection contains the same items with the same field values as the collection at the time of the last write.
5. FOR ALL valid Task collections, serializing then deserializing the collection SHALL produce a collection where every Task is present with identical field values to the original.
6. FOR ALL valid Link collections, serializing then deserializing the collection SHALL produce a collection where every Link is present with identical field values to the original.
7. IF the value stored under `tld_tasks` or `tld_links` cannot be parsed as JSON, or parses to a non-array value, THEN THE Dashboard SHALL initialize that collection as empty and emit an error message to the browser console identifying which key was affected.

---

### Requirement 6: Layout and Visual Design

**User Story:** As a user, I want a clean, readable, and responsive layout, so that the Dashboard is easy to use across different screen sizes.

#### Acceptance Criteria

1. THE Dashboard SHALL present all four widgets (Greeting_Widget, Focus_Timer, Task_List, Quick_Links) on a single HTML page without requiring navigation to separate pages.
2. THE Dashboard SHALL apply all visual styles from exactly one CSS file located at `css/style.css`.
3. THE Dashboard SHALL load all application logic from exactly one JavaScript file located at `js/app.js`.
4. WHEN the viewport width is 768 px or wider, THE Dashboard SHALL arrange the four widgets in a multi-column grid layout with a minimum of 2 columns.
5. WHEN the viewport width is below 768 px, THE Dashboard SHALL arrange the four widgets in a single-column stacked layout where each widget occupies 100% of the viewport width.
6. THE Dashboard SHALL use a font size of at least 16 px for body text to ensure readability.
7. THE Dashboard SHALL provide sufficient color contrast between text and background to meet WCAG 2.1 AA contrast ratio requirements (minimum 4.5:1 for normal text).
8. WHEN the viewport width changes from above 768 px to below 768 px, or from below 768 px to above 768 px, THE Dashboard SHALL transition between multi-column and single-column layouts without requiring a page reload.
9. IF any of the four widgets (Greeting_Widget, Focus_Timer, Task_List, Quick_Links) fails to load, THEN THE Dashboard SHALL display the remaining widgets in the specified layout without leaving empty gaps that break the grid structure.
