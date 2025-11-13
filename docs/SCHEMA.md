# SCHEMA.md
## Maste Data DB
- MySQL DB
- Master data store
- SQL scripts **must be** idempotent or have a safe guard prevent multiple runs
- File hierarchy 
```
.
└── sql
    └── prod                 # Master Data DB schema definition SQL scripts.
        ├── 01-Tables          # Create table scripts.
        ├── 02-Upsert          # Upsert: Insert or UPdate on conflict scripts.
        ├── 03-Views           # Create view scripts.
        ├── 04-SP              # Create stored procedures scripts.
        └── zz-Archive         # DB clean up SP and Event definitions.
```

### Master Data DB Schema management
- **DB Install** node task
 - The task initializes the master data DB structure on first run.
 - Subsecvent runs rebuild or migrate schemas
  - => SQL scripts **must be** idempotent or has a safe guard prevent multiple runs
 - npm task `dbinstall`
 - implemented under `src/db-install/`
 - SQL scripts under `sql/prod/`
    - SQL scripts under subdirectories run in alphabetic order. (Both subdirectory and file order)
 - Note: `sql/timescale/` directory is not managed


## Time Series DB
- PostgrSQL DB + Timescale extension
- Timeseries data store
- File hierarchy 
```
.
└── sql
    └── timescale
```


 ---

## Entities 

 TBD.