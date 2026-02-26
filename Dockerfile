FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy full source
COPY . .

# Build frontend and backend
RUN npm run build

# Expose the server port
EXPOSE 5000

# Start server
CMD ["npm", "run", "start"]