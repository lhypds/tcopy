#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage (server environment): tcopy <text>"
    exit 1
fi

echo "$1" > clipboard.txt
echo "Text written to clipboard.txt: $1"
