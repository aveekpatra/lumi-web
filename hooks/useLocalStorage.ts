import { useState, useEffect } from "react";

// Custom hook for localStorage state
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        // Handle boolean values properly
        const parsedItem =
          typeof initialValue === "boolean"
            ? item === "true"
            : JSON.parse(item);
        console.log("[useLocalStorage] Loaded from localStorage:", parsedItem);
        setStoredValue(parsedItem);
      } else {
        console.log(
          "[useLocalStorage] No stored value, using initial:",
          initialValue
        );
        window.localStorage.setItem(key, JSON.stringify(initialValue));
      }
    } catch (error) {
      console.error(
        "[useLocalStorage] Error reading from localStorage:",
        error
      );
    }
  }, [key, initialValue]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      // Save state
      setStoredValue(valueToStore);

      // Save to localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      console.log(`[useLocalStorage] Saved to localStorage:`, valueToStore);
    } catch (error) {
      console.error("[useLocalStorage] Error saving to localStorage:", error);
    }
  };

  return [storedValue, setValue];
}
