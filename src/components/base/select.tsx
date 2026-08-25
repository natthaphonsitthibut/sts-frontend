import {
  Children,
  isValidElement,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type FocusEvent,
  type ReactElement,
  type Ref,
} from "react";
import { ChevronDown } from "lucide-react";
import { useDismissable } from "../../hooks/useDismissable";
import { cn } from "../../lib/utils";

export type SelectProps = ComponentPropsWithRef<"select">;

interface SelectOption {
  disabled?: boolean;
  label: string;
  value: string;
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
}

function getOptionText(children: unknown): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(getOptionText).join("");
  }
  return "";
}

function getOptions(children: SelectProps["children"]): SelectOption[] {
  return Children.toArray(children)
    .filter((child): child is ReactElement<ComponentPropsWithRef<"option">> =>
      isValidElement(child),
    )
    .map((child) => {
      const rawValue = child.props.value;
      const label = getOptionText(child.props.children);
      return {
        disabled: child.props.disabled,
        label,
        value: rawValue === undefined ? label : String(rawValue),
      };
    });
}

export function Select({
  className,
  children,
  defaultValue,
  disabled,
  id,
  name,
  onBlur,
  onChange,
  ref,
  required,
  value,
  ...props
}: SelectProps) {
  const innerRef = useRef<HTMLSelectElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(
    defaultValue === undefined ? "" : String(defaultValue),
  );
  const controlled = value !== undefined;
  const selectedValue = controlled ? String(value) : internalValue;
  const options = getOptions(children);
  const selectedLabel =
    options.find((option) => option.value === selectedValue)?.label ??
    options[0]?.label ??
    "";

  function emitBlur(event: FocusEvent<HTMLElement>): void {
    window.setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement))
        setOpen(false);
    }, 0);
    onBlur?.(event as unknown as FocusEvent<HTMLSelectElement>);
  }

  function emitChange(nextValue: string): void {
    if (!controlled) {
      setInternalValue(nextValue);
    }
    if (innerRef.current) {
      innerRef.current.value = nextValue;
    }
    onChange?.({
      currentTarget: innerRef.current ?? { name, value: nextValue },
      target: innerRef.current ?? { name, value: nextValue },
    } as unknown as ChangeEvent<HTMLSelectElement>);
  }

  function focusOption(position: "first" | "last" | "selected"): void {
    window.requestAnimationFrame(() => {
      const optionButtons = Array.from(
        containerRef.current?.querySelectorAll<HTMLButtonElement>(
          '[role="option"]:not(:disabled)',
        ) ?? [],
      );
      const selectedIndex = options.findIndex(
        (option) => option.value === selectedValue,
      );
      const index =
        position === "first"
          ? 0
          : position === "last"
            ? optionButtons.length - 1
            : Math.max(0, selectedIndex);
      optionButtons[index]?.focus();
    });
  }

  function selectOption(nextValue: string): void {
    emitChange(nextValue);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useDismissable(open, containerRef, () => setOpen(false));

  return (
    <div
      className="relative"
      onBlur={emitBlur}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
      ref={containerRef}
    >
      <select
        aria-hidden="true"
        aria-label={props["aria-label"]}
        className="sr-only"
        defaultValue={controlled ? undefined : defaultValue}
        disabled={disabled}
        name={name}
        onChange={onChange}
        ref={(element) => {
          innerRef.current = element;
          setRef(ref, element);
          // react-hook-form writes the reset value while registering the ref.
          // Synchronize in the commit callback, never by reading refs in render.
          if (!controlled && element) {
            setInternalValue((current) =>
              element.value === current ? current : element.value,
            );
          }
        }}
        required={required}
        tabIndex={-1}
        value={controlled ? value : undefined}
      >
        {children}
      </select>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={id ? `${id}-listbox` : undefined}
        aria-invalid={props["aria-invalid"]}
        aria-label={props["aria-label"]}
        className={cn(
          "flex h-10 min-h-10 w-full items-center rounded-lg border border-slate-300 bg-white px-3 py-0 pr-10 text-left text-sm font-medium leading-5 text-slate-800 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:border-red-400 aria-[invalid=true]:focus:ring-red-400/20",
          className,
        )}
        disabled={disabled}
        id={id}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (
            ["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(
              event.key,
            )
          ) {
            event.preventDefault();
            event.stopPropagation();
            if (!open) setOpen(true);
            focusOption(
              event.key === "ArrowUp" || event.key === "End"
                ? "last"
                : event.key === "Home"
                  ? "first"
                  : "selected",
            );
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <span className="block min-w-0 flex-1 truncate">{selectedLabel}</span>
      </button>
      <ChevronDown
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-primary transition-transform",
          open && "rotate-180",
          disabled && "text-slate-500",
        )}
        aria-hidden="true"
      />
      {open && !disabled ? (
        <ul
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
        >
          {options.map((option) => (
            <li key={option.value} role="presentation">
              <button
                className={cn(
                  "block min-h-10 w-full px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-500",
                  option.value === selectedValue &&
                    "bg-slate-50 font-medium text-primary",
                )}
                disabled={option.disabled}
                aria-selected={option.value === selectedValue}
                onClick={() => selectOption(option.value)}
                onKeyDown={(event) => {
                  const enabledOptions = Array.from(
                    containerRef.current?.querySelectorAll<HTMLButtonElement>(
                      '[role="option"]:not(:disabled)',
                    ) ?? [],
                  );
                  const currentIndex = enabledOptions.indexOf(
                    event.currentTarget,
                  );
                  const nextIndex =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? enabledOptions.length - 1
                        : event.key === "ArrowDown"
                          ? Math.min(
                              enabledOptions.length - 1,
                              currentIndex + 1,
                            )
                          : event.key === "ArrowUp"
                            ? Math.max(0, currentIndex - 1)
                            : -1;
                  if (nextIndex >= 0) {
                    event.preventDefault();
                    enabledOptions[nextIndex]?.focus();
                  }
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option.value);
                }}
                role="option"
                type="button"
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
