# syntax=docker/dockerfile:1

# --- build ---
FROM node:20-alpine AS build
WORKDIR /app

# Empty = same-origin. Nginx proxies /api/ to API_UPSTREAM at runtime.
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- serve ---
FROM nginx:alpine AS runtime

# Docker Compose / API repo service name. Override with API_UPSTREAM=api:8000 if needed.
ENV API_UPSTREAM=cino-hr-api:8000

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
