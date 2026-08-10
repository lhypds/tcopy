
tcopy
=====


`tcopy` is originally for only copying text, so I called it `tcopy`, it can copy files as well.  

Support macOS, Windows and Linux.  
So, if the P2P not blocked by your NAT, basically it can copy any file from any machine to any machine.  

In my test, the file transfer speed can reach 65MB/s.  


Install
-------

Requirements: Node.js 18 or newer. Nothing else — no Python, no pm2.  

```
npm install -g tcopy
```

This puts a `tcopy` command on your PATH on all three platforms (npm generates
`tcopy.cmd` and `tcopy.ps1` shims on Windows automatically).  

Then run the interactive setup:  

```
tcopy setup
```


Two Modes
---------

* Server Mode  

A server.  
Machine A and Machine B.  
On server, machine A and B, install `tcopy` and run `tcopy setup`.  
Select server mode, and select environment.  

On server, machine A and B, run `tcopy start` to start `server` and `client`.  
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
On machine A and B, install `tcopy` and run `tcopy setup`.  
Select storage mode. For storage path, you can select a local folder, or a network share folder.  

In storage mode, you can start a watcher to automatically get the clipboard content from the shared storage.  
Use `tcopy start` to start the watcher, and use `tcopy stop` to stop it.  

For text copy  
Machine A use `copy` command to copy text, it will be sent to the shared storage `.clipboard`, then on Machine B, use `paste` command it will get the text to local clipboard.  
On Machine B if user started a watcher, it will get the text from the shared storage and copy it to local clipboard.  

For file copy  
Machine A use `copy -f <file_path>` command to copy a file, it will be copied to the shared storage. And on Machine B, if use `paste -f <target_path>` command, it will copy from the file storage.  


Commands
--------

Usage: tcopy [copy|paste|clear|reset|update|setup|start|stop|restart|info|-v|--version|-h|--help|\<text\>]  

| Command         | Description                                             |
|-----------------|---------------------------------------------------------|
| `<text>`        | Copy text or files to server/storage clipboard          |
| `copy <text>`   | Copy text or files to server/storage clipboard          |
| `paste`         | Paste text or files from server/storage clipboard       |
| `clear`         | Clear the clipboard, log files                          |
| `reset`         | Reset all                                               |
| `update`        | Update tcopy to the latest version                      |
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


Configuration
-------------

Configuration and runtime state live in a per-user directory, not in the install
folder, so a `npm update` never wipes your settings:  

| Platform      | Location                          |
|---------------|-----------------------------------|
| macOS / Linux | `~/.config/tcopy/`                |
| Windows       | `%APPDATA%\tcopy\`                |

Set `TCOPY_CONFIG_DIR` to override it.  

| File            | Purpose                                     |
|-----------------|---------------------------------------------|
| `tcopy.env`     | `MODE` — `server` or `storage`               |
| `server.env`    | Server mode settings                         |
| `storage.env`   | Storage mode settings                        |
| `state/`        | Logs, pid files, peer ids, clipboard file    |

`tcopy info` prints the resolved paths.  

Upgrading from 0.0.x: the old `.env` files inside the checkout are migrated
automatically the first time you run any command.  


`.clipboard`
------------

`.clipboard` file is a plain text file. In storage mode it lives in your
configured `STORAGE_PATH`; in server mode the server keeps it in `state/`.  

Basically it is the content of the clipboard text.  
If there is an source ID, the content starts with `###ID=source_id###`.  

Example:  
`###ID=1775993192###Hello World`  

If things copied is a file.  
It will be `###ID=source_id###` followed by the file path.  
File path format: `+file[file_path]`  

Example:  
`###ID=1775993192###+file[~/Desktop/a.txt]`  


Shortcut Setup
--------------

* Windows  
Use like WinHotKey, pointing at `tcopy`.  

* macOS  
Keyboard Maestro  
Create new action with a custom shortcut.  
Trigger a "Execute Shell Script" to execute `tcopy`.  

* Linux  
Use system settings to set up a custom shortcut to execute `tcopy`.  


Development
-----------

```
git clone https://github.com/lhypds/tcopy
cd tcopy
npm install
npm link          # puts the local checkout on PATH as `tcopy`
```

In a git checkout, `tcopy update` runs `git pull`; otherwise it runs
`npm install -g tcopy@latest`.  
