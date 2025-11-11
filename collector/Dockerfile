FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .
RUN npm install && npm run build

CMD ["node", "dist/index.js"]
