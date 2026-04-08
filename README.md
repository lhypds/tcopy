
tcopy
=====


`tcopy` is for copying text between two computers in real time.  

When the text is updated on one machine, it will be immediately reflected on the other machine.  
It supports both server mode and file mode, allowing users to choose the most suitable method for their needs.  

Server mode:  
Use server to manage shared text and API to get or update shared text.  
2 machines must both have access to the server.  

File mode:  
Use a txt file as a shared file between two computers.  
2 computers must both have access to the file.  


Quick Start
-----------

For example, for server mode.
User want to copy from machine A to machine B through a server.

On server  
Clone the repository and run `./tcopy.sh install` to install the command.    
Run `tcopy setup` and choose `server` mode, then choose `server` environment.  
Then start the server with `tcopy start`.  

On both machine A and machine B  
Clone the repository and run `./tcopy.sh install` to install the command.  
Run `tcopy setup` and choose `server` mode, then choose `client` environment.  
Then start the client with `tcopy start`.  

On machine A  
Copy current clipboard  
`tcopy`  
Or copy any text  
`tcopy "abc"`  
`tcopy` will send text to server.  

On machine B
Client automatically receive the text and update clipboard.  
Use `Ctrl + V` to paste the text on machine B.  


Requirements
------------

Python3  
Node.js (for server mode)  


Shortcut Setup
--------------

Use `tcopy install` to install as a commmand.  

* Windows  
Use like WinHotKey.  

* macOS  
Keyboard Maestro  
Create new action with a custom shortcut.  
Trigger a "Execute Shell Script" to execute `tcopy`.  

* Linux  
Use system settings to set up a custom shortcut to execute `tcopy`.  


Development
-----------

Server APIs  

GET `/sse`  
Create a Server-Sent Events (SSE) stream connection between the server and the client.  
Client can listen to the stream and update the content in real time.  

GET `/`  
Server simply read the `clipboard.txt` and send the content as response.  

POST `/`  
The client will send the content in request body to the server.  
The server will save the content to the `clipboard.txt`.  
