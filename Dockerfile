FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install --global "$(node -p 'require("./package.json").packageManager')"
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN pnpm build
RUN pnpm prune --prod

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
WORKDIR /app
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/src/database/migrations ./src/database/migrations
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json
USER nestjs
EXPOSE 3000
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/main.js"]
