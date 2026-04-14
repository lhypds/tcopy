
tcopy: Server Mode `client` Environment
=======================================


* `client.js` is a SSE client and a PeerJS client, also provide Express server functions.  

To start client, use:  
`cd client && node client.js`  
or  
`npm run start:client`  

* `copy.sh` will execute `post.js` from the arg or local clipboard to the remote clipboard.
`paste.sh` will execute `fetch.js` from the remote client to fetch file (or text content), through the server as signaling server.


Components
----------

1. `copy.js`  

Read text from local clipboard and write to the server's clipboard file.  
`copy.js`  

Write the <text> to the server's clipboard file.  
`copy.js <text>`  

Write a reference to server's clipboard file.  
`copy.js [-f|--file] <file_path>`  
Clipboard text example:  
`+file[~/Documents/report.pdf]`  

2. `paste.js`  

Read the clipboard file and paste to local clipboard.  
`paste.js`  

Paste the referenced file to current directory.  
`paste.js [-f|--file]`  

Read the clipboard file and paste the referenced file to <target_path>.  
`paste.js [-f|--file] <target_path>`  


Endpoints
---------

POST /filepaste  
Trigger paste operation.  


Log
---

`client/client.log` is the log output.  
