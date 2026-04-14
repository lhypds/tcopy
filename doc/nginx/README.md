# Nginx Configuration for TCopy Server Mode
location / {
    proxy_pass http://localhost:5460;
    proxy_http_version 1.1;                        # required for WebSocket
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;

    # Important for WebSocket support
    proxy_set_header Upgrade $http_upgrade;        # forward WS upgrade
    proxy_set_header Connection "upgrade";         # forward WS upgrade
    proxy_read_timeout 3600s;                      # keep WS connection alive
}
