# Docker Support

This document describes how to build and run the project by using Docker. The container image is designed for both local development and running automated tests.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24.x or newer.
- Access to any environment variables required by the application (for example, database connection details stored in an `.env` file).

## Building the Image

Build the image from the repository root:

```bash
docker build -t terminal-kdanni .
```

The Dockerfile installs runtime dependencies with `npm install` so that the resulting image can execute the application as well as the test suite.

## Running the Application

Run the service locally by publishing the container port to your host. The application defaults to port `3000` but also respects the `PORT` or `FEEDGEN_PORT` environment variables.

```bash
docker run --rm \
  --env-file .env \
  -p 3000:3000 \
  terminal-kdanni
```

If you do not need to provide an `.env` file, remove the `--env-file` flag. You can override the port with `-e PORT=8080` if your host port `3000` is unavailable.

## Orchestrating Services with Docker Compose

The repository includes a `docker-compose.yml` file that provisions the Node.js service alongside local database dependencies. The compose file defines the following services:

- `app`: builds the image defined in the `Dockerfile` and exposes port `3000`.
- `mysql`: runs MySQL 8 with persistent storage in the `mysql-data` volume.
- `timescale`: runs TimescaleDB (PostgreSQL) with persistent storage in the `timescale-data` volume.

Bring the full stack online with a single command:

```bash
docker compose up --build
```

The application container depends on the database services and is automatically configured to talk to them through the service hostnames (`mysql` and `timescale`). Update the environment variables in `docker-compose.yml` as needed if you use different credentials or database names.

Stop the stack and remove containers when you are done:

```bash
docker compose down
```

## Running Tests in a Container

The container image includes the tooling required for the Node.js test runner. You can run the test suite without rebuilding the image by overriding the default command.

```bash
docker run --rm terminal-kdanni npm test
```

For iterative development, mount your local workspace into the container so that code changes are picked up automatically:

```bash
docker run --rm \
  -it \
  -v "$(pwd)":/app \
  -w /app \
  terminal-kdanni npm test
```

Mounting the repository also allows you to reuse your local `.env` file and caches. When binding the working directory, ensure that `node_modules` is excluded or deleted locally so that the container uses the dependencies installed during the image build.

### Running Tests with Docker Compose

You can execute the test suite inside the compose-managed application container. This ensures the code runs with the same environment variables configured for the stack:

```bash
docker compose run --rm app npm test
```

Add `-it` if you want interactive test output. The command reuses the image built for the `app` service and automatically connects to the database containers defined in the compose file.

## Cleaning Up

Remove any stopped containers and the Docker image when you no longer need them:

```bash
docker container prune
# and/or
docker image rm terminal-kdanni
```
