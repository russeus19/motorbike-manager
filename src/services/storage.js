/**
 * Standalone replacement for the `window.storage` API that was available
 * inside the Claude.ai artifact sandbox. The game's save/load code was
 * written against that API (get/set/delete/list, all async, `get` throws
 * when a key doesn't exist), so instead of touching every call site we
 * provide a drop-in implementation backed by the browser's localStorage
 * and install it as `window.storage` on startup (see main.jsx).
 *
 * This changes nothing about how the game behaves — only how the save
 * data is physically persisted, which is required for the project to run
 * as a normal standalone web app outside Claude.ai.
 */

const INDEX_KEY = "__mbman_storage_index__";

function readIndex() {
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeIndex(keys) {
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(keys));
}

function addToIndex(key) {
  const keys = readIndex();
  if (!keys.includes(key)) {
    keys.push(key);
    writeIndex(keys);
  }
}

function removeFromIndex(key) {
  writeIndex(readIndex().filter((k) => k !== key));
}

export const localStorageDriver = {
  async get(key) {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      throw new Error(`No value stored for key "${key}"`);
    }
    return { key, value: raw };
  },

  async set(key, value) {
    window.localStorage.setItem(key, value);
    addToIndex(key);
    return { key, value };
  },

  async delete(key) {
    const existed = window.localStorage.getItem(key) !== null;
    window.localStorage.removeItem(key);
    removeFromIndex(key);
    return { key, deleted: existed };
  },

  async list(prefix) {
    const keys = readIndex().filter((k) => !prefix || k.startsWith(prefix));
    return { keys };
  },
};

/** Installs the localStorage-backed driver as `window.storage` unless
 * something else has already provided one (e.g. still running inside a
 * Claude.ai artifact preview). Call this once, before the app renders. */
export function installStorageDriver() {
  if (typeof window === "undefined") return;
  if (!window.storage) {
    window.storage = localStorageDriver;
  }
}
