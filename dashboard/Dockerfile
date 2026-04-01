# ── Stage 1: build React app ──────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install deps first (better layer caching)
COPY dashboard/package*.json ./
RUN npm ci

COPY dashboard/ ./

# VITE_API_URL=/api → all API calls go through Nginx proxy (same origin, no CORS)
# Override at build time:  --build-arg VITE_API_URL=http://myserver:8080
ARG  VITE_API_URL=/api
ENV  VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: serve with Nginx ─────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=build /app/dist              /usr/share/nginx/html
COPY dashboard/nginx.conf                /etc/nginx/conf.d/default.conf

EXPOSE 80
