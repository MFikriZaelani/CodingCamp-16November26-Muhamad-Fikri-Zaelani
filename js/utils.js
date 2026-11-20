/**
 * js/utils.js
 * Pure utility functions extracted from js/app.js for testability.
 * This file is an ES module and is imported by the property-based tests.
 * The functions here are identical to those in app.js Section 1 and
 * the timer tick logic from Section 4.
 */

/**
 * Returns HH:MM zero-padded 24-hour string for the given Date.
 * @param {Date} date
 * @returns {string}
 */
export function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Returns "<Weekday>, <DD> <Month> <YYYY>" string.
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
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
export function getGreeting(hour) {
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
export function formatTimer(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Returns true iff url starts with "http://" or "https://".
 * @param {string} url
 * @returns {boolean}
 */
export function isValidURL(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

/**
 * Returns true iff str is empty or whitespace-only.
 * @param {string} str
 * @returns {boolean}
 */
export function isBlank(str) {
  return typeof str !== 'string' || str.trim().length === 0;
}

/**
 * Serializes a Task array to a JSON string.
 * @param {Object[]} tasks
 * @returns {string}
 */
export function serializeTasks(tasks) {
  return JSON.stringify(tasks);
}

/**
 * Deserializes a JSON string to a Task array.
 * Returns null on parse failure or if the result is not an array.
 * @param {string} json
 * @returns {Object[]|null}
 */
export function deserializeTasks(json) {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

/**
 * Serializes a Link array to a JSON string.
 * @param {Object[]} links
 * @returns {string}
 */
export function serializeLinks(links) {
  return JSON.stringify(links);
}

/**
 * Deserializes a JSON string to a Link array.
 * Returns null on parse failure or if the result is not an array.
 * @param {string} json
 * @returns {Object[]|null}
 */
export function deserializeLinks(json) {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

/**
 * Pure tick function: given a remaining-seconds value, returns the new
 * value after one timer tick. Never goes below 0.
 * This mirrors the core logic of TimerModule._tick() (Section 4).
 * @param {number} remainingSeconds
 * @returns {number}
 */
export function timerTick(remainingSeconds) {
  if (remainingSeconds <= 0) return 0;
  return remainingSeconds - 1;
}
