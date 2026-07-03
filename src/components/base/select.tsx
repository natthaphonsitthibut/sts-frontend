import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type FocusEvent,
  type ReactElement,
  type Ref,
} from "react";
import { ChevronDown } from "lucide-react";
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

  function emitBlur(event: FocusEvent<HTMLButtonElement>): void {
    window.setTimeout(() => setOpen(false), 120);
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

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <select
        aria-hidden="true"
        className="sr-only"
        defaultValue={controlled ? undefined : defaultValue}
        disabled={disabled}
        name={name}
        onChange={onChange}
        ref={(element) => {
          innerRef.current = element;
          setRef(ref, element);
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
        aria-invalid={props["aria-invalid"]}
        aria-label={props["aria-label"]}
        className={cn(
          "flex h-10 min-h-10 w-full items-center rounded-lg border border-slate-200 bg-white px-3 py-0 pr-10 text-left text-sm font-medium leading-5 text-slate-800 shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:border-red-400 aria-[invalid=true]:focus:ring-red-400/20",
          className,
        )}
        disabled={disabled}
        id={id}
        onBlur={emitBlur}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="block min-w-0 flex-1 truncate">{selectedLabel}</span>
      </button>
      <ChevronDown
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-primary transition-transform",
          open && "rotate-180",
          disabled && "text-slate-400",
        )}
        aria-hidden="true"
      />
      {open && !disabled ? (
        <ul
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          role="listbox"
        >
          {options.map((option) => (
            <li key={option.value} role="presentation">
              <button
                className={cn(
                  "block min-h-10 w-full px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400",
                  option.value === selectedValue && "bg-slate-50 font-medium text-primary",
                )}
                disabled={option.disabled}
                onMouseDown={(event) => {
                  event.preventDefault();
                  emitChange(option.value);
                  setOpen(false);
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
