# Stage 1: build the PWA. src/gql/generated.ts is committed (codegen runs on
# the dev machine against a live Hasura), so the build needs no schema access.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit
COPY . .
ARG VITE_HASURA_ADMIN_SECRET
ENV VITE_HASURA_ADMIN_SECRET=$VITE_HASURA_ADMIN_SECRET
RUN npm run build

# Stage 2: Caddy serves the static PWA and proxies GraphQL/API same-origin.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
