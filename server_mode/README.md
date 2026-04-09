
tcopy: Server Mode
==================


Setup  
`setup.sh` is a helper script that sets up the `.env` file.  

Start, Stop, Restart  
Use `start.sh`, `stop.sh`, `restart.sh`  

Clear  
`clear.sh` is a helper script to delete all output files.  


`server` Environment
--------------------

* Using SSE (Server-Sent Events) to send clipboard data to clients.  

* `server.js` is an Express server, include clipboard operation, SSE, and PeerJS endpoints.  

To start server, use:  
`cd server && node server.js`  
or  
`npm run start:server`  

* Log  
`server/server.log` is the log output.  

* Endpoints  

GET /  
Get clipboard content.  

POST /  
Update clipboard content.  

GET /sse  
Subscribe to clipboard updates.  

GET /signal  
PeerJS (peer server) signaling endpoint.  


`client` Environment
--------------------

* `client.js` is a SSE client and a PeerJS client, also provide Express server functions.  

To start client, use:  
`cd client && node client.js`  
or  
`npm run start:client`  

* `copy.sh` will execute `post.js` from the arg or local clipboard to the remote clipboard.
`paste.sh` will execute `fetch.js` from the remote client to fetch file (or text content), through the server as signaling server.

* Log  
`client/client.log` is the log output.  

* Endpoints  

POST /paste  
Trigger paste operation.  
