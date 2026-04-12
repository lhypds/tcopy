
tcopy
=====


`tcopy` is for copying text between two computers in real time.  
Originally for only copying text, but I've added copying files feature.  


How It Works
------------

When the text is updated on one machine, it will be immediately reflected on the other machine.  
It supports both server mode and storage, allowing users to choose the most suitable method for their needs.  

Server mode:  
Use server to manage shared text and API to get or update shared text.  
2 machines must both have access to the server.  

Storage mode:  
Use a shared storage between two computers.  
2 computers must both have access to the shared storage.  


Quick Start
-----------

* For server mode  
For example, user want to copy from machine A to machine B through a server.

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

* For storage  
Both machine should setup to use the same shared storage path.  


Commands
--------

`tcopy`  
Usage: tcopy [copy|paste|install|uninstall|update|setup|start|stop|restart|info|-v|--version|-h|--help|<text>]  

`tcopy <text>` or `tcopy copy <text>`  
Copy the specified text to the clipboard and send it to the server or storage's clipboard text file.  

`tcopy -f <file_path>` or `tcopy copy -f <file_path>`  
For server mode, it will copy the file path to the server's clipboard file.  
For storage, it will copy the file to the shared storage, and copy the file path to the shared storage's clipboard file.  

`tcopy paste`  
Get the current text from the server/storage and copy it to the local clipboard.  

`tcopy paste -f <target_path>`  
Get the file from the server/storage and save it to the specified file path.  


Clipboard
---------

`.clipboard` file is a plain text file.  

Basically it is the content of the clipboard text.  
If there is an source ID, the content will starts with `###ID=source_id###`.  

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

Use `tcopy install` to install as a commmand.  
Use `tcopy setup`, select the mode and environment, setup will be done automatically.  

2. Shortcut Setup

* Windows  
Use like WinHotKey.  

* macOS  
Keyboard Maestro  
Create new action with a custom shortcut.  
Trigger a "Execute Shell Script" to execute `tcopy`.  

* Linux  
Use system settings to set up a custom shortcut to execute `tcopy`.  
