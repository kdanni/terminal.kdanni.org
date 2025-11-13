# terminal.kdanni.org

A modular, service-oriented platform for collecting, normalizing, and serving financial time series data. The project is organi zed into distinct layers so that ingestion, storage, and presentation can evolve independently while sharing a common schema and configuration vocabulary.


```
.
├── docs
    ├── ARCHITECTURE.md      # High-level system description
    ├── SCHEMA.md            # Database entities and conventions
    └── TESTPLAN.md          # Testing process guide lines
├── sql
    ├── prod                 # Master Data DB schema definition SQL scripts, (SQL scripts **must be** idempotent or have a safe guard prevent multiple runs)
        ├── 01-Tables          
        ├── 02-Upsert
        ├── 03-Views
        ├── 04-SP
        └── zz-Archive
    └── timescale            # Time series DB scripts
├── src                  # javascript source code
├── test                 # unit tests (TODO)
├── CONTEXT.md           # Project background and goals
├── package.json         # Workspace metadata and shared scripts
├── Dockerfile           # Container image definition
└── docker-compose.yml   # Container orchestration for app + databases
```



## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Initialize master data DB**

   ```bash
   npm run dbinstall
   ```

3. **Run task**

   ```bash
   npm run start <command line parameters>
   ```

## Docker Support

To build and run the application in a containerized environment, see [Docker.md](./Docker.md) for detailed instructions.

