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

# Set environment variables for secure OAuth
ENV GOOGLE_OAUTH_TOKENS_PATH=/app/youtube-oauth-tokens.json
ENV GOOGLE_OAUTH_CREDENTIALS_PATH=/app/gcp-oauth.keys.json

# Copy OAuth credentials securely
COPY gcp-oauth.keys.json ./gcp-oauth.keys.json

# Command is provided by smithery.yaml
CMD ["node", "dist/index.js"]