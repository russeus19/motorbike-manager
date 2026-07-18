import { CATEGORY_ORDER } from "../data/categories.js";

/** The empty per-category notifications shape, built from the central
 * category list — used at every game-init/fallback point instead of a
 * hardcoded three-key object, so a future category needs no changes here. */
export function emptyNotifications() {
  const next = {};
  CATEGORY_ORDER.forEach((cat) => { next[cat] = []; });
  return next;
}

export function mergeNotificationItems(prev, items, fallbackCategory) {
  const next = {};
  CATEGORY_ORDER.forEach((cat) => { next[cat] = [...(prev?.[cat] || [])]; });
  (items || []).forEach((item) => {
    const cat = item.category && next[item.category] ? item.category : fallbackCategory;
    // Every notification starts life unread; it only becomes read when the
    // player actually opens the Notification Center (see
    // markAllNotificationsRead below). Nothing is ever deleted here.
    next[cat] = [{ ...item, read: false }, ...next[cat]].slice(0, 50);
  });
  return next;
}

/** Marks every notification, in every category, as read. Called when the
 * player opens the Notification Center — this only flips a flag, it never
 * removes anything from the history. */
export function markAllNotificationsRead(notifications, categories = CATEGORY_ORDER) {
  const next = { ...notifications };
  categories.forEach((cat) => {
    next[cat] = (notifications?.[cat] || []).map((n) => (n.read ? n : { ...n, read: true }));
  });
  return next;
}

/** Number of unread notifications in a single category. */
export function countUnread(categoryNotifications) {
  return (categoryNotifications || []).filter((n) => !n.read).length;
}
