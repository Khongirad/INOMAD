# Frontend Dockerfile — Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY tsconfig*.json ./
COPY next.config.ts ./
COPY postcss.config.mjs ./
COPY eslint.config.mjs ./
COPY public ./public
COPY src ./src

# Build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Production ----
FROM node:18-alpine AS production

WORKDIR /app

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

# Security: non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["npm", "start"]
