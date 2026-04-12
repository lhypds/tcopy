#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage (server environment): tcopy <text>"
    exit 1
fi

ID="$(cat id 2>/dev/null || echo "")"
echo -n "###ID=${ID}###$1" > .clipboard
echo "Text written to .clipboard: $1"
