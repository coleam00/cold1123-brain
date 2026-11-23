// Pure rules for the capture key, kept out of React so they can be tested without a DOM.

/** True when the focused element takes typing, so the capture key must not fire. */
export function isTypingTarget(el: { tagName?: string; isContentEditable?: boolean } | null): boolean {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = (el.tagName ?? "").toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** True for a plain `n` with no modifier keys. */
export function isCaptureKey(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): boolean {
  return e.key === "n" && !e.ctrlKey && !e.metaKey && !e.altKey;
}
