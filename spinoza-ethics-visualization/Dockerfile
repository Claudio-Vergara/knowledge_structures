# Two-stage: build the static bundle with node, serve it with nginx. The runtime
# image carries no toolchain — just index.html and one JS file.
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first for better layer caching (Vite 8 needs Node
# ^20.19 || >=22.12, which the 22-alpine tag satisfies).
COPY package.json package-lock.json ./
RUN npm ci

# Everything the build actually reads. ethics.json / ethics_es.json live at the
# repo root and are imported as "../ethics.json" from src/ — they are bundled
# into the output JS, so the build fails outright without them.
COPY index.html vite.config.js ./
COPY ethics.json ethics_es.json ./
COPY src ./src
COPY public ./public

RUN npm run build

FROM nginx:alpine

# vite.config.js sets base: '/spinoza/', so every asset URL in the built
# index.html is absolute under /spinoza/. Landing the bundle in a matching
# subdirectory means the stock nginx config resolves those paths as-is and no
# custom nginx.conf is needed — Caddy proxies /spinoza/* through unstripped.
COPY --from=build /app/dist /usr/share/nginx/html/spinoza

EXPOSE 80
