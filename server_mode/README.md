
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

* `server.js` will start an Express server.  
`cd server && node server.js` to start the server.  

* Log  
`server/server.log` is the log output.  


`client` Environment
--------------------

* `client.js` will start an Express server.  
`cd client && node client.js` to start the client server.  

* `copy.sh` will execute `post.js` from the arg or local clipboard to the remote clipboard.
`paste.sh` will execute `fetch.js` from the remote client to fetch file (or text content), through the server as signaling server.

* Log  
`client/client.log` is the log output.  
