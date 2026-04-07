#!/bin/bash

# Get the directory where the script is located (portable across Linux/macOS)
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

# Load MODE and STORE from the .env file located in the same directory as the script
if [ -f "$ENV_FILE" ]; then
  ENV_VALUES=$(python3 - "$ENV_FILE" <<'PY'
import sys

env_file = sys.argv[1]
mode = ""
store = ""

with open(env_file, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key == "MODE":
            mode = value
        elif key == "STORE":
            store = value

print(f"{mode}\t{store}")
PY
)
  IFS=$'\t' read -r MODE STORE <<< "$ENV_VALUES"
else
  MODE=""
  STORE=""
fi

# Default to server mode when MODE is not set
if [ -z "$MODE" ]; then
  MODE="server"
fi
MODE=$(printf '%s' "$MODE" | tr '[:upper:]' '[:lower:]')

# Check if STORE is defined
if [ -z "$STORE" ]; then
  echo "STORE not defined in .env file. Please specify the target."
  exit 1
fi
echo "Mode: $MODE"
echo "Store: $STORE"

# Function to send POST request
send_request() {
  local text="$1"
  printf 'Sending request with text:\n%s\n' "$text"

  # Build a JSON payload safely (handles quotes/newlines)
  local json_payload
  json_payload=$(printf '%s' "$text" | python3 -c 'import json,sys; print(json.dumps({"text": sys.stdin.read()}))')

  # Print the curl command
  echo "Executing: curl -X POST ..."

  # Execute the curl command directly
  curl -X POST \
    -H "Content-Type: application/json" \
    --data "$json_payload" \
    "${STORE}"
  echo ""
}

# Function to write text to file store
write_to_file() {
  local text="$1"
  local store_dir

  store_dir=$(dirname "$STORE")
  mkdir -p "$store_dir"

  printf '%s' "$text" > "$STORE"
  echo "Content written to $STORE"
}

process_text() {
  local text="$1"

  if [ "$MODE" = "file" ]; then
    write_to_file "$text"
  elif [ "$MODE" = "server" ]; then
    send_request "$text"
  else
    echo "Invalid MODE in .env: $MODE (expected: file or server)"
    exit 1
  fi
}

# Check if input is being piped or provided as arguments
if [ -t 0 ]; then
  # No data is being piped, so check arguments
  if [ "$#" -eq 0 ]; then
    echo "No input provided. Please provide text or use the -f option to specify a file."
    exit 1
  fi

  if [ "$1" == "-f" ]; then
    if [ -z "$2" ]; then
      echo "No file provided after -f. Usage: tcopy -f <file>"
      exit 1
    fi

    # Read content from the file
    if [ -f "$2" ]; then
      file_content=$(<"$2")
      process_text "$file_content"
    else
      echo "File not found: $2"
      exit 1
    fi
  else
    # Check if text argument is non-empty
    if [ -z "$1" ]; then
      echo "No text provided. Please provide text or use the -f option to specify a file."
      exit 1
    fi
    process_text "$1"
  fi
else
  # Read from standard input
  stdin_content=$(cat)
  if [ -z "$stdin_content" ]; then
    echo "No input provided via stdin. Please provide text or use the -f option to specify a file."
    exit 1
  fi
  process_text "$stdin_content"
fi
