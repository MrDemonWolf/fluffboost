# Use a base image suitable for both development and production
FROM node:20-alpine AS base

# Set environment variables
ENV PORT=3000

# Set app directory
WORKDIR /usr/src/app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package.json and pnpm files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Use a lighter base image for development
FROM base AS development

# Expose server port for development
EXPOSE 3000

# Run the startup script
CMD ["/bin/sh", "-c", "./startup-dev.sh"]

# Use the base image for serving the application in production
FROM base AS production

# Copy the entire application
COPY . .

# Make startup script executable
RUN chmod +x startup.sh

# Run Prisma Generate to generate the Prisma Client
RUN pnpm db:generate

# Build the application
RUN pnpm build


# Expose server port for production (default to 3000)
ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

# Run the startup script
CMD ["/bin/sh", "-c", "./startup.sh"]