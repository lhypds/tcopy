
Two Modes
=========


`tcopy` can move your clipboard between machines in two different ways. Pick
one at `tcopy setup`.  

| | Server Mode | Storage Mode |
|---|---|---|
| Needs | A machine reachable by both | A folder both machines can see |
| Text  | Relayed through the server | Written to a file in the folder |
| Files | Sent directly P2P over WebRTC | Copied into the folder |


Server Mode
-----------

A server.  
Machine A and Machine B.  
On server, machine A and B, install `tcopy` and run `tcopy setup`.  
Select server mode, and select environment.  

On server, machine A and B, run `tcopy start` to start `server` and `client`.  
Make sure the SSE and Peer both connected to the server.  

For text copy  
Machine A use `tcopy` command to copy text, it will be sent to the server, and then sent to Machine B's clipboard.  

For files  
Machine A use `fcopy <file_path>` command to copy a file, it will be send as file reference to server.  
On Machine B, if use `fpaste <target_path>` command, it will start a P2P transfering the file from Machine A to Machine B.  
Server mode supports regular files only. Directories, including macOS `.app` bundles, are not transferred.  

The file itself never touches the server — only the reference does. The server
acts as the signaling server, and the bytes go straight from A to B. That is
why transfers are fast, and also why they fail if your NAT blocks P2P.  


Storage Mode
------------

A shared file storage.  
Machine A and Machine B.  
On machine A and B, install `tcopy` and run `tcopy setup`.  
Select storage mode. For storage path, you can select a local folder, or a network share folder.  

In storage mode, you can start a watcher to automatically get the clipboard content from the shared storage.  
Use `tcopy start` to start the watcher, and use `tcopy stop` to stop it.  

For text copy  
Machine A use `tcopy` command to copy text, it will be sent to the shared storage `.clipboard`, then on Machine B, use `tpaste` command it will get the text to local clipboard.  
On Machine B if user started a watcher, it will get the text from the shared storage and copy it to local clipboard.  

For file copy  
Machine A use `fcopy <file_path>` command to copy a file, it will be copied to the shared storage. And on Machine B, if use `fpaste <target_path>` command, it will copy from the file storage.  

Anything that syncs a folder works — Dropbox, iCloud Drive, OneDrive, Syncthing,
or a plain network share. There is no server to run and nothing to expose to the
network, but a copy of every file you send lives in the folder until it is
replaced.  
