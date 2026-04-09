
tcopy: Server Mode
==================


Setup
-----

`setup.sh` is a helper script that sets up the `.env` file.


`server` Environment
--------------------

* Using SSE (Server-Sent Events) to send clipboard data to clients.


`client` Environment
--------------------

* `client.js` will start an Express server.

* `copy.sh` will execute `post.js` from the arg or local clipboard to the remote clipboard.
`paste.sh` will execute `fetch.js` from the remote client to fetch file (or text content), through the server as signaling server.
