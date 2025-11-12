# LLM_HINTS.md

## Mission
Generate code and docs for **incremental, test-first, KISS** development of a personal financial data app (Node.js/TypeScript + PostgreSQL/TimescaleDB).

## Non-Negotiables (MUST)
- **MUST** create/update tests for every change (Jest).
- **MUST** include at least:
  - 1 happy-path test
  - 1 edge/failure test
  - 1 example usage in docs or comments if public API changes
- **MUST** keep diffs small and focused (≤ ~150 lines net when possible).
- **MUST** log structured, actionable errors (include symbol, interval, provider, ids).
- **MUST** show how to run locally (`npm test`, `docker compose up db`, etc.).

## Strong Preferences (SHOULD)
- **SHOULD** isolate side effects (I/O) behind adapter interfaces.
- **SHOULD** avoid global state—prefer dependency injection of adapters.
- **SHOULD** keep functions ≤ 30–40 lines; split when exceeding.
- **SHOULD** add input validation at boundaries (zod or lightweight guards).
- **SHOULD** use sensible defaults; fail fast with clear messages.

## Prohibitions (NEVER)
- **NEVER** add features without tests.
- **NEVER** introduce new dependencies without explaining why.
- **NEVER** implement speculative abstractions (“future-proofing”).
- **NEVER** silence errors or swallow rejections.

## Project Conventions
- Language: **TypeScript** (strict).
- Tests: **Jest** + ts-jest.
- Lint/format: eslint + prettier.
- DB: **pg** client; SQL kept simple and parameterized.
- Config: `dotenv` for local; read-only env in CI.
- File layout:
```
src/
  domain/ # pure logic (no I/O)
  adapters/ # db, http, fs, clock
  app/ # orchestration/use-cases
test/
  domain/
  adapters/
  app/
```

---

## Incremental Feature Recipe
1. **Describe the change** in 2–3 sentences.
2. **Add/adjust tests** that express desired behavior.
3. Implement **minimal** code to pass tests.
4. **Refactor** for clarity; keep tests green.
5. Update docs/examples if public surface changed.


## Example: New Provider Fetcher (sketch)
- Files:
- `src/adapters/provider/alphaVantage.ts`
- `test/adapters/provider/alphaVantage.test.ts`
- Tests include:
- success with realistic sample payload
- rate-limit handling (429 → backoff + retry)
- malformed payload mapping (fails loudly with path)
- Code:
- pure mapper (`domain`) from raw → `OHLCV`
- adapter that handles HTTP + retry + backoff
- no DB writes in the provider adapter

## DB Interaction Rules
- Use **parameterized queries**; return typed DTOs.
- Batch inserts; upsert on unique keys.
- Add indexes before shipping query-dependent features.
- Provide an **example query** in comments for each repository method.

## Logging/Errors
- Use a tiny logger (console is fine) with fields `{module, action, symbol, interval, provider}`.
- Errors include a **human fix hint** when possible.
- No stack traces in happy path logs.

## PR/Commit Template (auto-include in output)
**Title:** short imperative (e.g., “Add AV daily fetcher”)  
**Body:**
- What changed:
- Why:
- Tests:
- Notes/risks:

## Example Checklists
**Before coding**
- [ ] Smallest valuable change identified
- [ ] Test cases listed

**Before commit**
- [ ] Tests pass locally
- [ ] Lint/format clean
- [ ] Public API documented/examples updated
- [ ] Logs are actionable

## When Uncertain
- Propose a spike file under spikes/ with constraints: ≤ 100 lines, throwaway, comment header stating question → insight. Then convert to production with tests.
- Example:
```
Next sensible step: wire these with lightweight automation—pre-commit running `lint` and `test`, and a tiny CI that blocks merges without green tests and ≤ N changed lines.
```

---

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
