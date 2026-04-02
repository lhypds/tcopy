# !/bin/bash

# Setup env file
if [ ! -f .env ]; then
    cp .env.example .env
fi

# Install dependencies
npm install
