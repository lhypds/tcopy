

tcopy: Server Mode `server` Environment
=======================================


* Using SSE (Server-Sent Events) to send clipboard data to clients.  

* `server.js` is an Express server, include clipboard operation, SSE, and PeerJS endpoints.  

To start server, use:  
`cd server && node server.js`  
or  
`npm run start:server`  


Endpoints
---------

GET /  
Get server clipboard content.  

POST /  
Update server clipboard content.  

GET /sse  
Subscribe to server clipboard updates.  

GET /signal  
PeerJS (peer server) signaling endpoint.  


Log
---

`server/server.log` is the log output.  
