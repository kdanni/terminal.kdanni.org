# Database Configuration

This directory contains environment files that support the managed Flyway
migration workflow introduced for the collector service.

## Environment Variables

Create a `.env.flyway` file based on the snippet below to run migrations
locally without Docker Compose:

```
FLYWAY_URL=jdbc:postgresql://localhost:5432/market_data
FLYWAY_USER=finance
FLYWAY_PASSWORD=finance
FLYWAY_DEFAULT_SCHEMA=public
```

Pass the file to Flyway via `flyway -configFiles=flyway/conf/flyway.conf -envConfigFiles=config/database/.env.flyway migrate` or
export the variables in your shell before invoking Flyway.
