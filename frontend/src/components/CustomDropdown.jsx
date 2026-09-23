import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function CustomDropdown({
  options,
  value,
  defaultValue,
  onChange,
  name,
  placeholder,
  disabled = false,
  className = '',
  style,
  required = false,
  'aria-label': ariaLabel,
}) {
  const fallbackValue = defaultValue ?? options[0]?.value ?? '';
  const [uncontrolledValue, setUncontrolledValue] = useState(fallbackValue);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listId = useId();
  const selectedValue = value ?? uncontrolledValue;
  const selectedIndex = options.findIndex((option) => String(option.value) === String(selectedValue));
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    const closeWhenOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeWhenOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeWhenOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const selectOption = (option, index) => {
    if (value === undefined) setUncontrolledValue(option.value);
    onChange?.({
      target: {
        value: option.value,
        name,
        selectedIndex: index,
        options: options.map((item) => ({ value: item.value, text: item.label })),
      },
      currentTarget: { value: option.value, name },
    });
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div ref={rootRef} className={`custom-dropdown ${open ? 'is-open' : ''} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="custom-dropdown-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-required={required || undefined}
        disabled={disabled}
        style={style}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={selectedOption ? '' : 'custom-dropdown-placeholder'}>{selectedOption?.label ?? placeholder}</span>
        <ChevronDown size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      <div id={listId} className="custom-dropdown-menu" role="listbox" aria-label={ariaLabel}>
        {options.map((option, index) => {
          const selected = index === selectedIndex;
          return (
            <button
              key={`${option.value}-${option.label}`}
              type="button"
              role="option"
              aria-selected={selected}
              className={selected ? 'is-selected' : ''}
              onClick={() => selectOption(option, index)}
            >
              <span>{option.label}</span>
              {selected && <Check size={17} strokeWidth={2.25} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
