/**
 * Safe storage wrapper that gracefully handles restricted/sandboxed iframe environments,
 * third-party storage blocks, SecurityErrors, and QuotaExceededErrors.
 */
const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Ignore SecurityError or restricted access
    }
    return memoryStore.get(key) ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore SecurityError or quota exceeded
    }
    memoryStore.set(key, value);
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore SecurityError
    }
    memoryStore.delete(key);
  }
};
