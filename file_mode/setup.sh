#!/bin/bash

set -euo pipefail

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 is not installed or not in PATH."
  exit 1
fi

if [ ! -f "requirements.txt" ]; then
  echo "Error: requirements.txt not found in current directory."
  exit 1
fi

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

if [ ! -d ".venv" ]; then
  echo "Creating virtual environment at .venv..."
  python3 -m venv .venv
fi

echo "Installing Python packages in .venv from requirements.txt..."
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt

echo "File mode setup completed."
