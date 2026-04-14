
tcopy: Server Mode `client` Environment
=======================================


* `client.js` is a SSE client and a PeerJS client, also provide Express server functions.  

To start client, use:  
`cd client && node client.js`  
or  
`npm run start:client`  

* `copy.sh` will execute `post.js` from the arg or local clipboard to the remote clipboard.
`paste.sh` will execute `fetch.js` from the remote client to fetch file (or text content), through the server as signaling server.


Endpoints
---------

POST /filepaste  
Trigger paste operation.  


Log
---

`client/client.log` is the log output.  
