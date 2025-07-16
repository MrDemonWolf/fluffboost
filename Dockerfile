# Use a base image suitable for both development and production
FROM node:23-alpine AS base

# Set app directory
WORKDIR /usr/src/app

# Install pnpm and openssl globally
RUN npm install -g pnpm
RUN apk add --no-cache openssl

# Copy package.json and pnpm files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Use the base image for serving the application in production
FROM base AS production

# Set environment variables
ENV PORT=3000

# Copy the entire application
COPY . .

# Run Prisma Generate to generate the Prisma Client
RUN pnpm db:generate

# Build the application
RUN pnpm build

# Expose server port for production (default to 3000, can be overridden)
EXPOSE ${PORT}

# Copy the entrypoint script
COPY entrypoint.sh .

# Set the entrypoint to our script
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]

# Command to start the application
CMD ["node", "dist/app.js"]
