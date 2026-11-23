import { expect, test } from "bun:test";
import { isCaptureKey, isTypingTarget } from "./capture";

test("text fields count as typing targets; other elements and no focus do not", () => {
  expect(isTypingTarget({ tagName: "INPUT" })).toBe(true);
  expect(isTypingTarget({ tagName: "TEXTAREA" })).toBe(true);
  expect(isTypingTarget({ tagName: "SELECT" })).toBe(true);
  expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
  expect(isTypingTarget({ tagName: "BODY" })).toBe(false);
  expect(isTypingTarget({ tagName: "BUTTON" })).toBe(false);
  expect(isTypingTarget(null)).toBe(false);
});

test("only a plain n is the capture key", () => {
  const key = (key: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) => ({
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...mods,
  });
  expect(isCaptureKey(key("n"))).toBe(true);
  expect(isCaptureKey(key("N"))).toBe(false);
  expect(isCaptureKey(key("m"))).toBe(false);
  expect(isCaptureKey(key("n", { ctrlKey: true }))).toBe(false);
  expect(isCaptureKey(key("n", { metaKey: true }))).toBe(false);
  expect(isCaptureKey(key("n", { altKey: true }))).toBe(false);
});
