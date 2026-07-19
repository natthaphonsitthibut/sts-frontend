import { useCallback, useEffect, useRef, useState } from "react";
import { PII_REVEAL_TTL_MS } from "../lib/pii-presentation";

type SensitiveValues<Field extends string> = Partial<Record<Field, string>>;
type SensitiveVisibility<Field extends string> = Partial<Record<Field, boolean>>;

interface SensitiveRevealState<Field extends string> {
  scopeKey: string;
  values: SensitiveValues<Field>;
  visibleFields: SensitiveVisibility<Field>;
}

export function useTimedSensitiveReveal<Field extends string>(scopeKey: string) {
  const [state, setState] = useState<SensitiveRevealState<Field>>({
    scopeKey,
    values: {},
    visibleFields: {},
  });
  const timersRef = useRef(new Map<Field, number>());

  useEffect(() => {
    const timers = timersRef.current;
    for (const timer of timers.values()) {
      window.clearTimeout(timer);
    }
    timers.clear();
    const resetTimer = window.setTimeout(() => {
      setState((current) =>
        current.scopeKey === scopeKey
          ? current
          : { scopeKey, values: {}, visibleFields: {} },
      );
    }, 0);
    return () => {
      window.clearTimeout(resetTimer);
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, [scopeKey]);

  const reveal = useCallback((revealedValues: SensitiveValues<Field>): void => {
    const revealedFields = (Object.keys(revealedValues) as Field[]).filter(
      (field) => typeof revealedValues[field] === "string",
    );

    setState((current) => {
      const currentValues: SensitiveValues<Field> =
        current.scopeKey === scopeKey ? current.values : {};
      const nextVisibleFields: SensitiveVisibility<Field> =
        current.scopeKey === scopeKey ? { ...current.visibleFields } : {};
      for (const field of revealedFields) {
        nextVisibleFields[field] = true;
      }
      return {
        scopeKey,
        values: { ...currentValues, ...revealedValues },
        visibleFields: nextVisibleFields,
      };
    });

    for (const field of revealedFields) {
      window.clearTimeout(timersRef.current.get(field));
      const timer = window.setTimeout(() => {
        timersRef.current.delete(field);
        setState((current) => {
          if (current.scopeKey !== scopeKey) return current;
          const nextValues = { ...current.values };
          const nextVisibleFields = { ...current.visibleFields };
          delete nextValues[field];
          delete nextVisibleFields[field];
          return {
            ...current,
            values: nextValues,
            visibleFields: nextVisibleFields,
          };
        });
      }, PII_REVEAL_TTL_MS);
      timersRef.current.set(field, timer);
    }
  }, [scopeKey]);

  const hide = useCallback((field: Field): void => {
    setState((current) =>
      current.scopeKey === scopeKey
        ? {
            ...current,
            visibleFields: { ...current.visibleFields, [field]: false },
          }
        : current,
    );
  }, [scopeKey]);

  const showCached = useCallback((field: Field): void => {
    setState((current) =>
      current.scopeKey === scopeKey
        ? {
            ...current,
            visibleFields: { ...current.visibleFields, [field]: true },
          }
        : current,
    );
  }, [scopeKey]);

  const values: SensitiveValues<Field> =
    state.scopeKey === scopeKey ? state.values : {};
  const visibleFields: SensitiveVisibility<Field> =
    state.scopeKey === scopeKey ? state.visibleFields : {};

  return {
    hide,
    reveal,
    showCached,
    values,
    visibleFields,
  };
}
