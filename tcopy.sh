#!/bin/bash

# Load the STORE_URL from the .env file and trim any whitespace
STORE_URL=$(grep -oP '(?<=STORE_URL=).*' .env | tr -d '[:space:]')

# Check if STORE_URL is defined
if [ -z "$STORE_URL" ]; then
  echo "STORE_URL not defined in .env file. Please specify the URL."
  exit 1
fi
echo "Store URL: $STORE_URL"

# Function to send GET request
send_request() {
  local text="$1"
  echo "Sending request with text: $text"

  # Print the curl command
  echo "Executing: curl -G --data-urlencode \"text=${text}\" \"${STORE_URL}/save\""
  
  # Execute the curl command directly
  curl -G --data-urlencode "text=${text}" "${STORE_URL}/save"
  echo ""
}

# Check if input is being piped or provided as arguments
if [ -t 0 ]; then
  # No data is being piped, so check arguments
  if [ "$#" -eq 0 ]; then
    echo "No input provided. Please provide text or use the -f option to specify a file."
    exit 1
  fi

  if [ "$1" == "-f" ]; then
    # Read content from the file
    if [ -f "$2" ]; then
      file_content=$(<"$2")
      send_request "$file_content"
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
    send_request "$1"
  fi
else
  # Read from standard input
  stdin_content=$(cat)
  if [ -z "$stdin_content" ]; then
    echo "No input provided via stdin. Please provide text or use the -f option to specify a file."
    exit 1
  fi
  send_request "$stdin_content"
fi