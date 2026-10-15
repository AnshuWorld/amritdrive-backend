FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Ensure uploads directory exists
RUN mkdir -p uploads

# Set production environment
ENV NODE_ENV=production

# Render automatically provides the PORT environment variable at runtime.
# When running locally, server.js will default to 5000 if PORT is not set.
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
