#!/bin/bash

# PM2
pm2 delete ecosystem.config.cjs

# logs
rm client/client.log
rm server/server.log

# id
rm client/id
rm server/id

# clipboard.txt
rm server/clipboard.txt

echo "Cleared."
