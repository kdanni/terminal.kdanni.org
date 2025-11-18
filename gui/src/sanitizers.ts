const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/g;
const UNSAFE_TOKEN_PATTERN = /[<>"`]/g;
const WHITESPACE_PATTERN = /\s+/g;

function baseSanitize(value: string, maxLength: number): string {
  if (!value) {
    return '';
  }

  const withoutControlChars = value.replace(CONTROL_CHAR_PATTERN, '');
  const withoutUnsafeTokens = withoutControlChars.replace(UNSAFE_TOKEN_PATTERN, '');
  const collapsedWhitespace = withoutUnsafeTokens.replace(WHITESPACE_PATTERN, ' ').trim();

  return collapsedWhitespace.slice(0, maxLength);
}

export function sanitizeSearchTerm(value: string, maxLength = 120): string {
  return baseSanitize(value, maxLength);
}

export function sanitizeFilterValue(value: string, maxLength = 60): string {
  return baseSanitize(value, maxLength);
}

export function sanitizeUrl(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).toString();
  } catch (error) {
    console.warn('Ignoring invalid URL input', error);
    return null;
  }
}
