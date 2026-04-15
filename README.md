
tcopy
=====


`tcopy` is originally for only copying text, so I called it `tcopy`, it can copy files as well.  

Support macOS, Windows and Linux.  
So, if the P2P not blocked by your NAT, basically it can copy any file from any machine to any machine.  

In my test, the file transfer speed can reach 65MB/s.  


Two Modes
---------

* Server Mode  

A server.  
Machine A and Machine B.  

For text  
Machine A copies text, it will be sent to the server, and then sent to Machine B.  

For files  
Machine A copies a file, it will be send as file reference to server.  
On Machine B, if use `paste` command, it will start transfering the referenced file from Machine A to Machine B.  

Setup  
On server, machine A and B, clone code and run `./tcopy.sh setup`.  
Select server mode, and select environment.  
Setup `.env` file in `server_mode` folder.  

Start  
On server, run `tcopy start` to start the server.  
On machine A and B, run `tcopy start` to start the client.  
Make sure the SSE and Peer both connected to the server.  

* Storage Mode  

A shared file storage.  
Machine A and Machine B.  

For text:  
Machine A copies text, it will be sent to the shared storage `.clipboard`, on Machine B if user started a watcher, it will get the text from the shared storage and copy it to local clipboard.  

For files:  
Machine A copies a file, it will be copied to the shared storage. And on Machine B, if use `paste` command, it will copy from the file storage.  

Setup:  
On machine A and B, clone code and run `./tcopy.sh setup`. 
Select storage mode. For storage path, you can select a local folder, or a network share folder.
Setup `.env` file in `storage_mode` folder.  

Watcher:
In storage mode, you can start a watcher to automatically get the clipboard content from the shared storage.  
Use `tcopy start` to start the watcher, and use `tcopy stop` to stop it.  


Commands
--------

`tcopy`  
Usage: tcopy [copy|paste|install|uninstall|update|setup|start|stop|restart|info|-v|--version|-h|--help|<text>]  

* Copy  

`tcopy`  
Copy the current clipboard text to the server or storage's clipboard.  

Text copy
`tcopy <text>` or `tcopy copy <text>`  
Copy the specified text to the clipboard and send it to the server or storage's clipboard.  

File copy
`tcopy -f <file_path>` or `tcopy copy -f <file_path>`  
For server mode, it will copy the file path to the server's clipboard file.  
For storage mode, it will copy the file to the shared storage, and copy the file path to the shared storage's clipboard file.  

* Paste  

Text paste
`tcopy paste`  
Get the current text from the server/storage and copy it to the local clipboard.  

File paste
`tcopy paste -f`  
Transfer file from server/storage to current directory.  

`tcopy paste -f <target_path>`  
Transfer file from server/storage to target path.  


Clipboard
---------

`.clipboard` file is a plain text file.  

Basically it is the content of the clipboard text.  
If there is an source ID, the content will starts with `###ID=source_id###`.  

Example:  
`###ID=1775993192###Hello World`  

If things copied is a file.  
It will be `###ID=source_id###` followed by the file path.  
File path format: `+file[file_path]`  

Example:  
`###ID=1775993192###+file[~/Desktop/a.txt]`  


Setup
-----

Requirements:
Python3 (file storage mode), Node.js (for server mode)  

1. Setup `tcopy`

Use `tcopy setup`, select the mode and environment, setup will be done automatically.  

(Optional)  
Use `tcopy install` to install as a commmand.  

2. Shortcut Setup

* Windows  
Use like WinHotKey.  

* macOS  
Keyboard Maestro  
Create new action with a custom shortcut.  
Trigger a "Execute Shell Script" to execute `tcopy`.  

* Linux  
Use system settings to set up a custom shortcut to execute `tcopy`.  
