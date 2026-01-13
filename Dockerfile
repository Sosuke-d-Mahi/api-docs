
# Use Node.js 20 Alpine for a lightweight and secure base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy root package files to install dependencies first (caching layer)
COPY package*.json ./

# Install root dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Run the build script
# This script (defined in package.json) will:
# 1. cd into web/
# 2. install web dependencies
# 3. build the frontend to /app/dist
RUN npm run build

# Expose the application port
EXPOSE 6969

# Start the application
CMD ["npm", "start"]
