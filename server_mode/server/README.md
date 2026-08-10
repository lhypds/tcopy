

Server Mode `server` Environment
================================


* Using SSE (Server-Sent Events) to send clipboard data to clients.  

* `server.js` is an Express server, include clipboard operation, SSE, and PeerJS endpoints.  

To start server, use:  
`cd server && node server.js`  
or  
`npm run start:server`  


Endpoints
---------

GET /

Get server clipboard content or the Web UI using HTTP content negotiation.
`Accept: text/plain` (and the default `*/*`) returns clipboard text.
`Accept: text/html` returns the browser interface.

POST /  
Update server clipboard content.  

GET /sse  
Subscribe to server clipboard updates.  

GET /signal  
PeerJS (peer server) signaling endpoint.  


Web UI
------

Open the server URL in a browser, for example `http://localhost:5460/`. The
page shows live clipboard updates and lets you copy the text to the browser's
device or edit and save it back to the tcopy server.


Log
---

`server/server.log` is the log output.  



Troubleshooting
---------------

NGINX

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
