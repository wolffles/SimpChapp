# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20.8.0
FROM node:${NODE_VERSION} AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Copy all code first
COPY . .

# Install server dependencies
RUN npm install

# Install client dependencies and build React app
RUN cd SimplyChat && npm install --include=dev && npm run build

# Final stage for app image
FROM node:${NODE_VERSION}-slim

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
CMD ["npm", "run", "start"]