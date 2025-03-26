FROM --platform=$BUILDPLATFORM node:23-alpine
WORKDIR /usr/src/app

# Copy all files from the current directory to the container
COPY . .

# Install Bash
RUN apk update && apk add bash

# Install backend libraries
RUN npm cache clean --force && npm ci --verbose

# Install frontend libraries
RUN cd frontend && npm cache clean --force && npm ci

# Build backend
RUN npm run build

# Build frontend
RUN cd frontend && npm run build

# Clean up by removing the frontend node_modules directory
RUN rm -rf frontend/node_modules

# Expose port 8080 for the application
EXPOSE 8080

# Set the command to run the application
CMD [ "node", "dist/src/index.js" ]
