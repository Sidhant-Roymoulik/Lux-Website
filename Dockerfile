# syntax = docker/dockerfile:1

ARG NODE_VERSION=20.17.0

# Stage 1: compile the chess engine
# Use same base as runtime (node:slim = Debian Bookworm) to avoid glibc mismatch.
# Install g++-13 explicitly: g++-12 (Bookworm default) has an ICE with chess.hpp C++20 templates.
FROM node:${NODE_VERSION}-slim AS engine-build

RUN apt-get update -qq && \
  apt-get install --no-install-recommends -y \
  ca-certificates \
  g++-13 \
  make \
  git && \
  apt-get clean && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/Sidhant-Roymoulik/Lux /lux

WORKDIR /lux
RUN CXX=g++-13 make release

# Stage 2: build the Remix app
FROM node:${NODE_VERSION}-slim AS app-build

WORKDIR /app

COPY --link package-lock.json package.json ./
RUN npm ci --include=dev

COPY --link . .
RUN npm run build
RUN npm prune --omit=dev

# Stage 3: minimal runtime image
FROM node:${NODE_VERSION}-slim

LABEL fly_launch_runtime="Remix"

WORKDIR /app
ENV NODE_ENV="production"

COPY --from=app-build /app /app
COPY --from=engine-build /lux/src/executables/Lux-modern /app/engine/Lux-modern

EXPOSE 3000
CMD [ "npm", "run", "start" ]
