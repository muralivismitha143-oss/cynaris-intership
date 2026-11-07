# ==============================================================================
# Multi-Stage Dockerfile — Cynaris Recruitment Platform
# Target: High-Security, Minimal Footprint Node.js / Express Production Container
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Dependency Isolation (Builder Stage)
# ------------------------------------------------------------------------------
FROM node:18-alpine AS builder

WORKDIR /app

# Set production flag during build to avoid pulling devDependencies
ENV NODE_ENV=production

# Copy root and backend dependency manifests
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install only production dependencies cleanly without optional dev tooling
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund && \
    cd backend && \
    npm install --omit=dev --ignore-scripts --no-audit --no-fund && \
    npm cache clean --force

# ------------------------------------------------------------------------------
# Stage 2: Minimal Production Runtime (Runner Stage)
# ------------------------------------------------------------------------------
FROM node:18-alpine AS runner

LABEL maintainer="Murali <murali@cynaris.com>" \
      description="Cynaris Recruitment Platform - Production Container" \
      version="1.0.0"

# Install curl/wget for container health monitoring and dumb-init for PID 1 signal forwarding
RUN apk add --no-cache dumb-init curl wget

WORKDIR /app

# Create a dedicated non-root application user and group (Least Privilege Security)
RUN addgroup -g 1001 -S cynarisgroup && \
    adduser -u 1001 -S cynarisuser -G cynarisgroup

# Production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    REMINDERS_PORT=3005 \
    CLIENT_TIMEZONE=Asia/Kolkata

# Copy production node_modules from builder stage with correct non-root ownership
COPY --from=builder --chown=cynarisuser:cynarisgroup /app/node_modules ./node_modules
COPY --from=builder --chown=cynarisuser:cynarisgroup /app/backend/node_modules ./backend/node_modules

# Copy essential application source code with non-root ownership
COPY --chown=cynarisuser:cynarisgroup package.json ./
COPY --chown=cynarisuser:cynarisgroup backend ./backend
COPY --chown=cynarisuser:cynarisgroup client ./client
COPY --chown=cynarisuser:cynarisgroup application ./application
COPY --chown=cynarisuser:cynarisgroup custom ./custom

# Switch to unprivileged non-root user
USER cynarisuser

# Expose primary Express gateway and Smart Reminders microservice ports
EXPOSE 3000 3005

# Container Healthcheck verifying the active REST API /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Launch production server via dumb-init to ensure proper SIGTERM/SIGINT signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "backend/server.js"]
