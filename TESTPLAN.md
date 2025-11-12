# TESTPLAN.md

All modules must include test coverage if possible.

When adding new code:
1. Write unit tests first (test-driven if possible).
2. Run `npm test` to confirm no regressions.
3. If modifying existing behavior, update the related test file.
4. Never merge untested logic.

Each PR or code generation task must include:
- source file(s)
- matching test file(s)
- test results (passed ✅)
