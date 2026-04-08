#!/bin/bash

set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is not installed or not in PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed or not in PATH."
  exit 1
fi

if [ ! -f "package.json" ]; then
  echo "Error: package.json not found in current directory."
  exit 1
fi

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

if [ -f ".env" ]; then
  current_url=$(grep -E "^SERVER_BASE_URL=" .env | cut -d'=' -f2-)
  if [ -z "$current_url" ]; then
    read -rp "Enter SERVER_BASE_URL (e.g., http://localhost:5460): " input_url
    if [ -z "$input_url" ]; then
      echo "Error: SERVER_BASE_URL cannot be empty."
      exit 1
    fi
    sed -i.bak "s|^SERVER_BASE_URL=.*|SERVER_BASE_URL=$input_url|" .env && rm -f .env.bak
    echo "SERVER_BASE_URL set to: $input_url"
  fi
fi

echo "Installing npm packages from package.json..."
npm install

echo "Client setup completed."
