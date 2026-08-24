# Imagen para Easypanel. Build multi-etapa: el runtime solo lleva el standalone.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# Los scripts de base son JavaScript plano y solo necesitan pg y bcryptjs,
# que el standalone ya trae. No hace falta TypeScript en producción.
COPY --from=build --chown=nextjs:nodejs /app/db ./db

USER nextjs
EXPOSE 3000

# Las migraciones se aplican al arrancar. Son idempotentes, así que un
# reinicio no repite nada; y si una falla, el contenedor no levanta, que es
# preferible a servir la app contra un esquema a medias.
CMD ["sh", "-c", "node db/migrate.mjs && node server.js"]
