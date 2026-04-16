
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
On server, machine A and B, clone code and run `./tcopy.sh setup`.  
Select server mode, and select environment.  
Setup `.env` file in `server_mode` folder.  

On server, machine A and B, run `./tcopy.sh start` to start `server` and `client`.  
Make sure the SSE and Peer both connected to the server.  

For text copy  
Machine A use `copy` command to copy text, it will be sent to the server, and then sent to Machine B's clipboard.  

For files  
Machine A use `copy -f <file_path>` command to copy a file, it will be send as file reference to server.  
On Machine B, if use `paste -f <target_path>` command, it will start a P2P transfering the file from Machine A to Machine B.  
Server mode supports regular files only. Directories, including macOS `.app` bundles, are not transferred.  

* Storage Mode  

A shared file storage.  
Machine A and Machine B.  
On machine A and B, clone code and run `./tcopy.sh setup`. 
Select storage mode. For storage path, you can select a local folder, or a network share folder.
Setup `.env` file in `storage_mode` folder.  

In storage mode, you can start a watcher to automatically get the clipboard content from the shared storage.  
Use `./tcopy.sh start` to start the watcher, and use `./tcopy.sh stop` to stop it.  

For text copy  
Machine A use `copy` command to copy text, it will be sent to the shared storage `.clipboard`, then on Machine B, use `paste` command it will get the text to local clipboard.  
On Machine B if user started a watcher, it will get the text from the shared storage and copy it to local clipboard.  

For file copy  
Machine A use `copy -f <file_path>` command to copy a file, it will be copied to the shared storage. And on Machine B, if use `paste -f <target_path>` command, it will copy from the file storage.  


Commands
--------

`tcopy`  
Usage: tcopy [copy|paste|clear|reset|install|uninstall|update|setup|start|stop|restart|info|-v|--version|-h|--help|<text>]  

| Command         | Description                                             |
|-----------------|---------------------------------------------------------|
| `<text>`        | Copy text or files to server/storage clipboard          |
| `copy <text>`   | Copy text or files to server/storage clipboard          |
| `paste`         | Paste text or files from server/storage clipboard       |
| `clear`         | Clear the clipboard, log files                          |
| `reset`         | Reset all                                               |
| `install`       | Install as a system command                             |
| `uninstall`     | Uninstall the system command                            |
| `update`        | Update tcopy, run `git pull`                            |
| `setup`         | Initial setup                                           |
| `start`         | Start server/watcher                                    |
| `stop`          | Stop server/watcher                                     |
| `restart`       | Restart server/watcher                                  |
| `info`          | Show information                                        |
| `-v, --version` | Show version                                            |
| `-h, --help`    | Show help                                               |

* `copy`  

`tcopy`  
Copy the current clipboard text to the server or storage's clipboard.  

Text copy  
`tcopy <text>` or `tcopy copy <text>`  
Copy the specified text to the clipboard and send it to the server or storage's clipboard.  

File copy  
`tcopy -f <file_path>` or `tcopy copy -f <file_path>`  
For server mode, it will copy the file reference to the server's clipboard file.  
For storage mode, it will copy the file to the shared storage, and copy the file reference to the shared storage's clipboard file.  
In server mode, `<file_path>` must be a regular file. Directories such as macOS application bundles are rejected.  

Multiple files copy  
`tcopy -f <file_path_1> <file_path_2> ...` or `tcopy copy -f <file_path_1> <file_path_2> ...`  
For server mode, it will copy the file references to the server's clipboard file.  
For storage mode, it will copy the files to the shared storage, and copy the file references to the shared storage's clipboard file.  

* `paste`  

Text paste  
`tcopy paste`  
Get the current text from the server/storage and copy it to the local clipboard.  

File paste  
`tcopy paste -f`  
Transfer file(s) from server/storage to current directory.  

`tcopy paste -f <target_path>`  
Transfer file(s) from server/storage to target path.  


`.clipboard`
------------

`.clipboard` file is a plain text file in `tcopy/server_mode/server` or `tcopy/storage_mode`.  

Basically it is the content of the clipboard text.  
If there is an source ID, the content starts with `###ID=source_id###`.  

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

Use `./tcopy.sh setup`, select the mode and environment, setup will be done automatically.  

(Optional)  
Use `./tcopy.sh install` to install as a commmand.  
After install you can type `tcopy` in terminal to use it.  

2. Shortcut Setup  

* Windows  
Use like WinHotKey.  

* macOS  
Keyboard Maestro  
Create new action with a custom shortcut.  
Trigger a "Execute Shell Script" to execute `./tcopy.sh`.  

* Linux  
Use system settings to set up a custom shortcut to execute `./tcopy.sh`.  
