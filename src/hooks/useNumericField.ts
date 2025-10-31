import { useState, useEffect, useCallback } from 'react';

const formatToString = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  // Ensure it's a string before replacing
  return String(value).replace('.', ',');
};

const parseToNumber = (value: string): number | null => {
  if (value.trim() === '') return null;
  // Replace comma with dot for parsing
  const numericValue = parseFloat(value.replace(',', '.'));
  return isNaN(numericValue) ? null : numericValue;
};

/**
 * A custom hook to manage numeric inputs that use a comma for the decimal separator.
 * It handles the conversion between the string representation (for the input)
 * and the numeric value (for the form state).
 *
 * @param initialValue The initial numeric value.
 * @param onChange A callback function to update the parent component's state with the new numeric value.
 * @returns An object with `value` (string) and `onChange` (handler) to be spread onto an <Input /> component.
 */
export const useNumericField = (
  initialValue: number | null | undefined,
  onChange: (value: number | null) => void
) => {
  const [stringValue, setStringValue] = useState<string>(() => formatToString(initialValue));

  // When the initial value from the parent changes (e.g., loading a different product),
  // update the local string value.
  useEffect(() => {
    // Only update if the parsed string value is different from the new initial value
    // to avoid overriding user input during re-renders.
    if (parseToNumber(stringValue) !== initialValue) {
      setStringValue(formatToString(initialValue));
    }
  }, [initialValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Allow only numbers and a single comma
    let sanitized = rawValue.replace(/[^0-9,]/g, '');
    
    // If user starts with a comma, prepend a zero
    if (sanitized.startsWith(',')) {
      sanitized = '0' + sanitized;
    }

    // Ensure only one comma exists
    const parts = sanitized.split(',');
    if (parts.length > 2) {
      sanitized = parts[0] + ',' + parts.slice(1).join('');
    }
    
    setStringValue(sanitized);
    onChange(parseToNumber(sanitized));
  }, [onChange]);

  return {
    value: stringValue,
    onChange: handleChange,
  };
};
