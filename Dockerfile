# syntax = docker/dockerfile:1

ARG NODE_VERSION=20.17.0
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Remix"

WORKDIR /app
ENV NODE_ENV="production"

RUN apt-get update -qq && \
  apt-get install --no-install-recommends -y \
  g++ \
  make \
  git

RUN git config --global http.sslVerify false

# Clone and build Lux chess engine
RUN git clone --depth 1 https://github.com/Sidhant-Roymoulik/Lux /lux

WORKDIR /lux/src
RUN make release

WORKDIR /app

FROM base as build

COPY --link package-lock.json package.json ./
RUN npm ci --include=dev

COPY --link . .
RUN npm run build
RUN npm prune --omit=dev

FROM base

COPY --from=build /app /app
COPY --from=build /lux/src/executables/Lux-bmi2 /app/engine/Lux-bmi2

EXPOSE 3000
CMD [ "npm", "run", "start" ]
