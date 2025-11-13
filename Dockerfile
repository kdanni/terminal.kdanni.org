# syntax=docker/dockerfile:1
FROM node:20-bullseye-slim AS base

WORKDIR /app

# Install build tooling required by native node modules such as mysql2
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        python3 \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "dbinstall"]
CMD ["npm", "start"]
