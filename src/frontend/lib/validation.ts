export type ValidationResult = {
  isValid: boolean;
  message: string | null;
};

const EmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CountryCodePattern = /^[A-Z]{2}$/;
const SlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function valid(): ValidationResult {
  return { isValid: true, message: null };
}

export function invalid(message: string): ValidationResult {
  return { isValid: false, message };
}

export function firstInvalid(...results: ValidationResult[]): ValidationResult {
  return results.find((result) => !result.isValid) ?? valid();
}

export function validateRequired(value: string, label: string, maxLength = 120): ValidationResult {
  const cleaned = value.trim();
  if (cleaned.length === 0) {
    return invalid(`${label} is required.`);
  }

  if (cleaned.length > maxLength) {
    return invalid(`${label} must be ${maxLength} characters or less.`);
  }

  return valid();
}

export function validateOptionalText(value: string, label: string, maxLength = 300): ValidationResult {
  if (value.trim().length > maxLength) {
    return invalid(`${label} must be ${maxLength} characters or less.`);
  }

  return valid();
}

export function validateEmail(value: string, label = "Email"): ValidationResult {
  const cleaned = value.trim();
  if (cleaned.length === 0) {
    return invalid(`${label} is required.`);
  }

  if (cleaned.length > 254 || !EmailPattern.test(cleaned)) {
    return invalid(`Enter a valid ${label.toLowerCase()}.`);
  }

  return valid();
}

export function validatePassword(value: string, minLength = 8): ValidationResult {
  if (value.length < minLength) {
    return invalid(`Password must be at least ${minLength} characters.`);
  }

  if (value.length > 128) {
    return invalid("Password must be 128 characters or less.");
  }

  return valid();
}

export function validatePhone(value: string, label = "Mobile number", required = false): ValidationResult {
  const cleaned = value.trim();
  if (cleaned.length === 0) {
    return required ? invalid(`${label} is required.`) : valid();
  }

  if (!/^\+?[0-9\s-]+$/.test(cleaned)) {
    return invalid(`${label} can contain only digits, spaces, hyphen, and an optional +.`);
  }

  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return invalid(`${label} must be 10 to 15 digits.`);
  }

  return valid();
}

export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^\d+\s-]/g, "").replace(/(?!^)\+/g, "").slice(0, 20);
}

export function validateCountryCode(value: string): ValidationResult {
  if (!CountryCodePattern.test(value.trim().toUpperCase())) {
    return invalid("Country code must be exactly 2 letters.");
  }

  return valid();
}

export function validateSlug(value: string): ValidationResult {
  const cleaned = value.trim();
  if (cleaned.length === 0) {
    return invalid("Restaurant slug is required.");
  }

  if (cleaned.length > 120 || !SlugPattern.test(cleaned)) {
    return invalid("Restaurant slug can use lowercase letters, numbers, and single hyphens only.");
  }

  return valid();
}

export function validatePositiveInteger(value: string, label: string, max = 10000): ValidationResult {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > max) {
    return invalid(`${label} must be a whole number from 1 to ${max}.`);
  }

  return valid();
}

export function validateMoney(value: string, label: string, max = 1000000): ValidationResult {
  const cleaned = value.trim();
  if (cleaned.length === 0) {
    return invalid(`${label} is required.`);
  }

  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) {
    return invalid(`${label} must be a valid amount with up to 2 decimals.`);
  }

  const number = Number(cleaned);
  if (!Number.isFinite(number) || number < 0 || number > max) {
    return invalid(`${label} must be between 0 and ${max}.`);
  }

  return valid();
}

export function validateOptionalUrl(value: string, label = "URL"): ValidationResult {
  const cleaned = value.trim();
  if (cleaned.length === 0) {
    return valid();
  }

  if (cleaned.length > 1000) {
    return invalid(`${label} must be 1000 characters or less.`);
  }

  try {
    const url = new URL(cleaned);
    return url.protocol === "http:" || url.protocol === "https:" ? valid() : invalid(`${label} must start with http:// or https://.`);
  } catch {
    return invalid(`Enter a valid ${label.toLowerCase()}.`);
  }
}

export function validateDateRange(dateFrom: string, dateTo: string): ValidationResult {
  if (!dateFrom || !dateTo) {
    return invalid("From and To dates are required.");
  }

  if (dateFrom > dateTo) {
    return invalid("From date cannot be after To date.");
  }

  return valid();
}
