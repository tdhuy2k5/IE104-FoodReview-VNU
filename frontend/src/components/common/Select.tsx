import { Children, isValidElement, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import "./Select.css";
import { Icon } from "./Icon";

export function Select({ value, onChange, children, disabled = false, label }: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  label: string;
}) {
  const options = Children.toArray(children).flatMap(child =>
    isValidElement<{ value: string | number; children: ReactNode }>(child)
      ? [{ value: String(child.props.value), label: child.props.children }] : [],
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const selected = options.findIndex(option => option.value === value);
  const search = useRef({ text: "", time: 0 });

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  useEffect(() => {
    if (open) root.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (index: number) => {
    if (!options[index]) return;
    onChange(options[index].value);
    setOpen(false);
    trigger.current?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault(); event.stopPropagation(); setOpen(false); return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      setActive(event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
        : !open ? Math.max(0, selected)
        : (active + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault(); choose(active);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== " ") {
      const now = Date.now();
      search.current.text = (now - search.current.time < 700 ? search.current.text : "") + event.key.toLocaleLowerCase();
      search.current.time = now;
      const index = options.findIndex(option => String(option.label).toLocaleLowerCase().startsWith(search.current.text));
      if (index >= 0) { event.preventDefault(); setOpen(true); setActive(index); }
    }
  };

  return (
    <div ref={root} className="select-control" data-open={open && !disabled}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
      <button ref={trigger} type="button" className="select-trigger" role="combobox"
        aria-label={label} aria-haspopup="listbox" aria-expanded={open && !disabled}
        aria-controls={`${id}-list`} aria-activedescendant={open ? `${id}-${active}` : undefined}
        disabled={disabled} onKeyDown={onKeyDown}
        onClick={() => { setActive(Math.max(0, selected)); setOpen(!open); }}>
        <span className="select-value">{options[selected]?.label ?? options[0]?.label}</span>
        <span className="dropdown-arrow" aria-hidden="true"><Icon name="chevron" size={16} className="dropdown-chevron" /></span>
      </button>
      {open && !disabled && (
        <div id={`${id}-list`} className="select-options" role="listbox" aria-label={label}>
          {options.map((option, index) => (
            <div key={option.value} id={`${id}-${index}`} role="option"
              aria-selected={option.value === value} data-index={index} data-active={index === active}
              className="select-option" onPointerMove={() => setActive(index)}
              onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}>
              <span className="select-check" aria-hidden="true">{option.value === value ? "✓" : ""}</span>
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
