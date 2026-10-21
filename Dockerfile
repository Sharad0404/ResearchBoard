# Multi-stage / Production Dockerfile for ResearchBoard
FROM node:24-slim

# Set container working directory
WORKDIR /app

# Install native compilation dependencies for SQLite bindings
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy project source code
COPY . .

# Ensure data directory exists for SQLite database storage
RUN mkdir -p /app/data

# Expose application service port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Container healthcheck probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3000/api/auth/me', (r) => { process.exit(r.statusCode === 401 || r.statusCode === 200 ? 0 : 1); });"

# Run application server
CMD ["node", "server.js"]
