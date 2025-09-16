FROM node:18-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files first for better caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy pre-built application
COPY dist/ ./dist/

# Command is provided by smithery.yaml
CMD ["node", "dist/index.js"]