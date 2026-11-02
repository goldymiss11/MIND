// Storage can throw in private windows and some webviews; nothing here is essential.
export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(`mind:${key}`);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(`mind:${key}`, value);
  } catch {
    // Safe ignore
  }
}
