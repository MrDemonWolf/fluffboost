# Use a base image suitable for both development and production
FROM node:22-slim AS base

# Set app directory
WORKDIR /usr/src/app

# Install pnpm globally and openssl/curl
RUN npm install -g pnpm &&
    apt-get update &&
    apt-get install -y openssl curl --no-install-recommends &&
    rm -rf /var/lib/apt/lists/*

# Copy package files first to leverage Docker caching
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Use the base image for serving the application in production
FROM base AS production

# Set environment variables
ENV PORT=3000

# Copy the entire application
COPY . .

# Make startup script executable
RUN chmod +x startup.sh

# Run Prisma Generate to generate the Prisma Client
RUN pnpm prisma generate

# Build the application
RUN pnpm build

# Expose server port for production (default to 3000, can be overridden)
EXPOSE ${PORT}

# Command to start the application
CMD ["./startup.sh"]
