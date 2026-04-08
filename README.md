
tcopy
=====


`tcopy` is for copying text between two computers in real time.  


Features
--------

1. Realtime synchronization  

When the text is updated on one machine, it will be immediately reflected on the other machine.  

2. Multiple modes  

It supports both server mode and file mode, allowing users to choose the most suitable method for their needs.  

Server mode:  
Use server to manage shared text and API to get or update shared text.  
2 machines must both have access to the server.  

File mode:  
Use a txt file as a shared file between two computers.  
2 computers must both have access to the file.  


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
Server will send the content as SSE stream.  
Client can listen to the stream and update the content in real time.  

GET `/`  
Server simply read the file and send the content as response.  

POST `/`  
The client will send the content in request body to the server.  
The server will save the content to a file.  
