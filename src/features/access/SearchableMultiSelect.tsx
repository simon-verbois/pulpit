import { useMemo, useRef, useState } from "react";
import {
  Button,
  Label,
  LabelGroup,
  MenuToggle,
  type MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from "@patternfly/react-core";
import { CloseIcon } from "@patternfly/react-icons";

import { MODAL_TYPEAHEAD_POPPER_PROPS } from "./modalTypeaheadPopperProps";

interface SearchableMultiSelectProps {
  id: string;
  ariaLabel: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  noOptionsText: string;
  isDisabled?: boolean;
}

const NO_RESULTS = "__pulpit_no_results__";

/** PatternFly multi-typeahead used for known Pulp resources. Values can only
 * be selected from the supplied options: free-form names are deliberately not
 * accepted because a typo would make the access API fail at submit time. */
export function SearchableMultiSelect({
  id,
  ariaLabel,
  options,
  selected,
  onChange,
  placeholder,
  noOptionsText,
  isDisabled = false,
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedOptions = useMemo(
    () => [...new Set(options)].sort((a, b) => a.localeCompare(b)),
    [options],
  );
  const visibleOptions = useMemo(() => {
    const normalizedFilter = filter.trim().toLocaleLowerCase();
    if (!normalizedFilter) return sortedOptions;
    return sortedOptions.filter((option) =>
      option.toLocaleLowerCase().includes(normalizedFilter),
    );
  }, [filter, sortedOptions]);
  const listboxId = `${id}-listbox`;
  const activeOptionId =
    focusedIndex === null || !visibleOptions[focusedIndex]
      ? undefined
      : `${id}-option-${focusedIndex}`;

  const resetFocus = () => setFocusedIndex(null);
  const closeMenu = () => {
    setIsOpen(false);
    resetFocus();
  };
  const toggleSelection = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((selection) => selection !== value)
        : [...selected, value],
    );
    setFilter("");
    setIsOpen(false);
    resetFocus();
    inputRef.current?.focus();
  };

  const handleArrowKey = (key: "ArrowUp" | "ArrowDown") => {
    if (visibleOptions.length === 0) return;
    setIsOpen(true);
    setFocusedIndex((current) => {
      if (current === null) return key === "ArrowDown" ? 0 : visibleOptions.length - 1;
      if (key === "ArrowDown") return (current + 1) % visibleOptions.length;
      return (current - 1 + visibleOptions.length) % visibleOptions.length;
    });
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      variant="typeahead"
      aria-label={`${ariaLabel} selector`}
      onClick={() => {
        setIsOpen((open) => !open);
        inputRef.current?.focus();
      }}
      isExpanded={isOpen}
      isDisabled={isDisabled}
      isFullWidth
    >
      <TextInputGroup isPlain>
        <TextInputGroupMain
          inputId={id}
          value={filter}
          onClick={(event) => {
            event.stopPropagation();
            setIsOpen(true);
          }}
          onChange={(_event, value) => {
            setFilter(value);
            setIsOpen(true);
            resetFocus();
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              handleArrowKey(event.key);
            } else if (event.key === "Enter") {
              // Always prevent the default: this is a filter field, not a
              // form submit trigger - without this, Enter with no focused
              // option yet (the common case right after typing) falls
              // through to the browser's implicit form submission and
              // reloads the page instead of just opening/selecting.
              event.preventDefault();
              const focusedOption =
                focusedIndex === null ? undefined : visibleOptions[focusedIndex];
              if (isOpen && focusedOption) {
                toggleSelection(focusedOption);
              } else {
                setIsOpen(true);
              }
            }
          }}
          autoComplete="off"
          innerRef={inputRef}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-activedescendant={activeOptionId}
          role="combobox"
          isExpanded={isOpen}
          aria-controls={listboxId}
        >
          <LabelGroup aria-label={`Selected ${ariaLabel.toLocaleLowerCase()}`}>
            {selected.map((selection) => (
              <Label
                key={selection}
                variant="outline"
                closeBtnAriaLabel={`Remove ${selection}`}
                onClose={(event) => {
                  event.stopPropagation();
                  toggleSelection(selection);
                }}
              >
                {selection}
              </Label>
            ))}
          </LabelGroup>
        </TextInputGroupMain>
        <TextInputGroupUtilities
          {...(selected.length === 0 ? { style: { display: "none" } } : {})}
        >
          <Button
            variant="plain"
            aria-label={`Clear selected ${ariaLabel.toLocaleLowerCase()}`}
            icon={<CloseIcon />}
            onClick={(event) => {
              event.stopPropagation();
              onChange([]);
              setFilter("");
              resetFocus();
              inputRef.current?.focus();
            }}
          />
        </TextInputGroupUtilities>
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <Select
      id={`${id}-select`}
      isOpen={isOpen}
      selected={selected}
      onSelect={(_event, value) => {
        if (typeof value === "string" && value !== NO_RESULTS) toggleSelection(value);
      }}
      onOpenChange={(open) => {
        if (!open) closeMenu();
      }}
      toggle={toggle}
      variant="typeahead"
      role="listbox"
      popperProps={MODAL_TYPEAHEAD_POPPER_PROPS}
      isScrollable
      maxMenuHeight="16rem"
    >
      <SelectList isAriaMultiselectable id={listboxId} aria-label={ariaLabel}>
        {visibleOptions.length === 0 ? (
          <SelectOption value={NO_RESULTS} isAriaDisabled>
            {filter ? `No matches for “${filter}”` : noOptionsText}
          </SelectOption>
        ) : (
          visibleOptions.map((option, index) => (
            <SelectOption
              id={`${id}-option-${index}`}
              key={option}
              value={option}
              isFocused={focusedIndex === index}
              isSelected={selected.includes(option)}
            >
              {option}
            </SelectOption>
          ))
        )}
      </SelectList>
    </Select>
  );
}
