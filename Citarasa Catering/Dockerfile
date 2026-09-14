# syntax=docker/dockerfile:1

# 1. Tahap Dependensi
FROM node:24-alpine AS dependensi
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci

# 2. Tahap Build
FROM node:24-alpine AS perakit
WORKDIR /app
COPY --from=dependensi /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Nilai dummy hanya untuk tahap build
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/citarasa"
ENV SESSION_SECRET="build-time-secret-at-least-32-characters-long"
ENV NEXT_PUBLIC_BASE_URL="http://localhost:3000"

RUN npm run build

# 3. Tahap Runner Produksi
FROM node:24-alpine AS pelari
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Siapkan folder uploads dengan izin kepemilikan user nextjs
RUN mkdir -p public/unggahan/bukti && chown -R nextjs:nodejs public/unggahan

COPY --from=perakit /app/public ./public
COPY --from=perakit /app/package.json ./package.json
COPY --from=perakit /app/node_modules ./node_modules
COPY --from=perakit /app/.next ./.next
COPY --from=perakit /app/prisma ./prisma
COPY --from=perakit /app/prisma.config.ts ./prisma.config.ts
COPY --from=perakit /app/src/generated ./src/generated

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]

