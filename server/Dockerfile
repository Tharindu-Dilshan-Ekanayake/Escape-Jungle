# Escape The Jungle game server (Colyseus) for Boxity Legion.
# Listens on $PORT, answers GET /health, runs as a non-root user.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Colyseus handles SIGTERM itself: rooms are disposed (saves are written), then it exits.
USER node
EXPOSE 2567
CMD ["node", "dist/index.js"]
