#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: $0 <text>"
    exit 1
fi

echo "$1" > clipboard.txt
echo "Text written to clipboard.txt: $1"
