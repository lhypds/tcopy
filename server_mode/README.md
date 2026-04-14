
tcopy: Server Mode
==================


Setup  
`setup.sh` is a helper script that sets up the `.env` file.  

Clear  
`clear.sh` is a helper script to delete all output files.  


PM2
---

PM2 is used to manage the server and client processes.

Start, Stop, Restart  
Use `start.sh`, `stop.sh`, `restart.sh`  


PeerJS WebRTC
-------------

* PeerJS is used for P2P file transfer, using the server as signaling server.  

How it works:  

1. Start server, listen on `/signal` for PeerJS signaling.  

2. Start client A on machine A.  
Client id for example is `1111111`.  
It subscribe the server's SSE for clipboard updates.  
It connect to server's PeerJS signaling endpoint.  

3. Start client B on machine B, connect to server.  
Client id for example is `2222222`.  
It subscribe the server's SSE for clipboard updates.  
It connect to server's PeerJS signaling endpoint.  

4. On client A on machine A, user copy a file and it triggers `copy.sh` to send file path to server.  
Example:  
`copy.sh "+file[~/Desktop/a.txt]"`

5. Server will write it to `.clipboard`.  
Example:  
`###ID=1111111###+file[~/Desktop/a.txt]`
It will broadcast the update to client A and client B through SSE.  

6. On client B on machine B, user use `paste.sh` to trigger paste operation.  
Example:  
`paste.sh "~/Desktop"`
For client, `paste.sh` will trigger `fetch.js`.  
`fetch.js` will read the latest clipboard content from server. 
If the clipboard content is a file path.  
Example:  
`###ID=1111111###+file[~/Desktop/a.txt]`
It will parse the client id (peer id, `1111111`) and original file path (`~/Desktop/a.txt`).  
It will send a POST request to local client's server (`client.js`) `/filepaste` with the paste path.  

File transfer direction:  
 Orignal file path      ->   Paste path  
 `~/Desktop/a.txt`          `~/Desktop`  
 Client A (id:1111111)    Client B (id:2222222)  
    Machine A                 Machine B  

7. Client B's `client.js` will receive the POST request on `/filepaste`.  
Then use PeerJS to connect to client A (id:1111111) and request the file.  
