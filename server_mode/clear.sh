#!/bin/bash

# PM2
pm2 delete ecosystem.config.cjs

# logs
rm client/client.log
rm server/server.log

# id
rm client/id
rm server/id

# .clipboard
rm server/.clipboard

echo "Cleared."
