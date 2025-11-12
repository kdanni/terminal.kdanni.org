# LLM_HINTS.md

## Core Rule: Always Write Tests
Whenever you generate or modify code:
- Also write matching **unit tests**.
- If a function or module is new, create a `__tests__` or `test/` file automatically.
- Use **Jest** for testing Node.js/TypeScript code.
- Prefer **realistic, small data samples**.
- Mock API calls, database access, and network requests.
- Each test file must include:
  - at least one success case
  - at least one failure/edge case
  - a simple snapshot or data comparison when applicable
- Never skip tests with `test.skip` or `it.only`.

## Testing Philosophy
- **Test as documentation:** Each test should teach how the function is supposed to behave.
- **Test before optimize:** Always test correctness first; performance tests come later.
- **Fail loudly:** Tests should surface bugs early rather than silently passing.

## Structure
Tests mirror the source tree:
```
src/
  collector/
    fetchAlphaVantage.ts
test/
  collector/
    fetchAlphaVantage.test.ts
```

### ✅ Good
**Examples**

- source
```ts
// src/utils/normalize.ts
export function normalizeSymbol(sym: string): string {
  return sym.trim().toUpperCase();
}
```
- test
```ts
// test/utils/normalize.test.ts
import { normalizeSymbol } from '../../src/utils/normalize';

test('normalizes case and whitespace', () => {
  expect(normalizeSymbol(' msft ')).toBe('MSFT');
});

test('handles empty input gracefully', () => {
  expect(normalizeSymbol('')).toBe('');
});
```

### 🚫 Avoid
> Generating code without any associated tests or without updating existing tests.
