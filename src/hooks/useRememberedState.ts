import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useAuthSessionStore } from "../features/auth/store/auth-session.store";

const rememberedValues = new Map<string, unknown>();

interface RememberedState<Value> {
  scopedKey: string;
  value: Value;
}

function resolveInitialValue<Value>(
  initialValue: Value | (() => Value),
): Value {
  return typeof initialValue === "function"
    ? (initialValue as () => Value)()
    : initialValue;
}

function readRememberedValue<Value>(
  scopedKey: string,
  initialValue: Value | (() => Value),
): Value {
  return rememberedValues.has(scopedKey)
    ? (rememberedValues.get(scopedKey) as Value)
    : resolveInitialValue(initialValue);
}

/**
 * Remembers transient list state while the SPA is open, including across a
 * detail-page round trip. Values stay in memory only: they are not written to
 * URLs or browser storage, which keeps names and identifiers out of history,
 * server logs and shared-device persistence. The actor id prevents state from
 * crossing accounts if users switch without reloading the tab.
 */
export function useRememberedState<Value>(
  key: string,
  initialValue: Value | (() => Value),
): [Value, Dispatch<SetStateAction<Value>>] {
  const actorId = useAuthSessionStore((state) => state.user?.id ?? "anonymous");
  const scopedKey = `${actorId}:${key}`;
  const [state, setState] = useState<RememberedState<Value>>(() => ({
    scopedKey,
    value: readRememberedValue(scopedKey, initialValue),
  }));
  const value =
    state.scopedKey === scopedKey
      ? state.value
      : readRememberedValue(scopedKey, initialValue);

  const setRememberedValue = useCallback<Dispatch<SetStateAction<Value>>>(
    (nextValue) => {
      setState((currentState) => {
        const currentValue =
          currentState.scopedKey === scopedKey
            ? currentState.value
            : readRememberedValue(scopedKey, initialValue);
        const resolvedValue =
          typeof nextValue === "function"
            ? (nextValue as (current: Value) => Value)(currentValue)
            : nextValue;
        rememberedValues.set(scopedKey, resolvedValue);
        return { scopedKey, value: resolvedValue };
      });
    },
    [initialValue, scopedKey],
  );

  return [value, setRememberedValue];
}
