#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "client.py" ]; then
	echo "Error: client.py not found in $SCRIPT_DIR"
	exit 1
fi

if [ ! -d ".venv" ]; then
	echo "Error: .venv not found. Please run ./setup.sh first."
	exit 1
fi

if [ ! -f ".env" ]; then
	if [ -f ".env.example" ]; then
		echo "Error: .env not found. Create it from .env.example and set SERVER_BASE_URL."
	else
		echo "Error: .env not found. Please create it and set SERVER_BASE_URL."
	fi
	exit 1
fi

SERVER_BASE_URL="$(grep -E '^SERVER_BASE_URL=' .env | tail -n 1 | cut -d '=' -f2- | sed 's/^"//; s/"$//' | sed "s/^'//; s/'$//")"
if [ -z "${SERVER_BASE_URL:-}" ]; then
	echo "Error: SERVER_BASE_URL is not set in .env"
	exit 1
fi

exec .venv/bin/python client.py
