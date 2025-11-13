# TESTPLAN.md

## CLI driven development
- One-shot task are run based on commandline parameters.
 - ***Production*** (PROD) tasks are the final end-to-end workflows.
 - ***Development time*** (DEV) tasks are used for exploration POC and test runs.
 - The categories aren't strict, a task may envolve from DEV to PROD


## Planned testing process
- Domain specific modules should include test coverage.
- npm test task:
 - `"test": "node --test --test-reporter=spec test/**/*.test.js"`
 - prefered built in node test capabilities
 - test should be under `test/domain-folders/`
