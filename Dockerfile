# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Install curl for healthcheck
RUN apk add --no-cache curl

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_URL=${DATABASE_URL}
ENV JWT_SECRET=${JWT_SECRET}

# Create a startup script
RUN echo '#!/bin/sh\n\
    echo "Running database migrations..."\n\
    npx prisma migrate deploy\n\
    echo "Starting NestJS application..."\n\
    npm run start:prod' > /app/start.sh && chmod +x /app/start.sh

# Start the application
CMD ["/app/start.sh"]
