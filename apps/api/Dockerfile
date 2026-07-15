FROM node:20-alpine AS build
WORKDIR /workspace

RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
RUN npm ci

COPY apps/api apps/api
COPY packages/shared packages/shared
COPY packages/tsconfig packages/tsconfig
RUN npm run build -w @nexops/shared && npm run build -w @nexops/api

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /workspace/apps/api/dist apps/api/dist
COPY --from=build /workspace/packages/shared/dist packages/shared/dist

RUN mkdir -p /workspace/apps/api/uploads && chown -R node:node /workspace/apps/api/uploads

USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:4000/api/v1/health || exit 1
CMD ["node", "apps/api/dist/server.js"]
