# !/bin/bash

# Ensure Node.js is installed
if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Setup env file
if [ ! -f .env ]; then
    cp .env.example .env
fi

# Ensure PM2 is available globally
if ! command -v pm2 >/dev/null 2>&1; then
    echo "PM2 not found. Installing globally..."
    npm install -g pm2
else
    echo "PM2 is already installed: $(pm2 -v)"
fi

# Install dependencies
npm install
