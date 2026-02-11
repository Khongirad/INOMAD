# Backend Dockerfile — Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and Prisma schema
COPY prisma ./prisma
COPY tsconfig*.json ./
COPY src ./src

# Generate Prisma client
RUN npx prisma generate

# Build
RUN npm run build

# ---- Production ----
FROM node:18-alpine AS production

WORKDIR /app

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built application and Prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Security: non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "dist/main.js"]
