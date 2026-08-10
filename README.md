
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
git clone https://github.com/lhypds/tcopy
cd tcopy
./install.sh
```

This installs the dependencies and puts the four commands — `tcopy`, `tpaste`,
`fcopy`, `fpaste` — on your PATH.  

On Windows run the two steps directly, there is no shell script involved:  

```
npm install
npm link
```

Either way npm generates `.cmd` and `.ps1` shims on Windows, so the commands
work the same in cmd, PowerShell and Git Bash.  

Then run the interactive setup:  

```
tcopy setup
```

To remove it again, run `./uninstall.sh` (or `npm rm -g tcopy` on Windows).
Your configuration is kept unless you pass `--purge`.  


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
Machine A use `tcopy` command to copy text, it will be sent to the server, and then sent to Machine B's clipboard.  

For files  
Machine A use `fcopy <file_path>` command to copy a file, it will be send as file reference to server.  
On Machine B, if use `fpaste <target_path>` command, it will start a P2P transfering the file from Machine A to Machine B.  
Server mode supports regular files only. Directories, including macOS `.app` bundles, are not transferred.  

* Storage Mode  

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


Commands
--------

There are four commands — `t` is for text, `f` is for files:  

| Command            | Description                                          |
|--------------------|------------------------------------------------------|
| `tcopy [text]`     | Copy text (no argument copies the system clipboard)  |
| `tpaste`           | Paste text into the system clipboard                 |
| `fcopy <path>...`  | Copy one or more files                               |
| `fpaste [dir]`     | Paste stored file(s) into dir (default: current dir) |

* `tcopy`  

`tcopy`  
Copy the current clipboard text to the server or storage's clipboard.  

`tcopy <text>`  
Copy the specified text to the server or storage's clipboard.  

* `tpaste`  

`tpaste`  
Get the current text from the server/storage and copy it to the local clipboard.  

* `fcopy`  

`fcopy <file_path>`  
For server mode, it will copy the file reference to the server's clipboard file.  
For storage mode, it will copy the file to the shared storage, and copy the file reference to the shared storage's clipboard file.  
In server mode, `<file_path>` must be a regular file. Directories such as macOS application bundles are rejected.  

`fcopy <file_path_1> <file_path_2> ...`  
Copy multiple files at once.  

* `fpaste`  

`fpaste`  
Transfer file(s) from server/storage to the current directory.  

`fpaste <target_path>`  
Transfer file(s) from server/storage to target path.  


Management
----------

Everything that is not copy/paste lives under `tcopy`:  

| Command         | Description                                             |
|-----------------|---------------------------------------------------------|
| `tcopy setup`   | Initial setup                                           |
| `tcopy start`   | Start server/watcher                                    |
| `tcopy stop`    | Stop server/watcher                                     |
| `tcopy restart` | Restart server/watcher                                  |
| `tcopy info`    | Show information                                        |
| `tcopy clear`   | Clear the clipboard, log files                          |
| `tcopy reset`   | Reset all                                               |
| `tcopy update`  | Update tcopy (`git pull` in the checkout)               |
| `tcopy -v`      | Show version                                            |
| `tcopy -h`      | Show help                                               |

`-v`/`--version` and `-h`/`--help` also work on `tpaste`, `fcopy` and `fpaste`.  


Configuration
-------------

Configuration and runtime state live in a per-user directory, not in the
checkout, so pulling or reinstalling never touches your settings:  

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

`./install.sh` links the checkout onto your PATH rather than copying it, so
edits take effect immediately — there is nothing to reinstall after a change.
For the same reason `tcopy update` just runs `git pull`.  

```
tcopy         # ── bin/tcopy.js
tpaste        # ── bin/tpaste.js      thin entry points
fcopy         # ── bin/fcopy.js
fpaste        # ── bin/fpaste.js

cli.js          command dispatch, shared by all four
config.js       config directory, .env read/write, 0.0.x migration
daemon.js       start/stop/status for the background process
utils/          file-reference parsing, prompts
storage_mode/   copy, paste and the clipboard-file watcher
server_mode/    client, server and the PeerJS file transfer
```

Both modes take the same argument shape internally: a bare value is text, a
leading `-f` means files. `fcopy` and `fpaste` add that flag for you, which is
why the two modes need no special-casing.  

If you add a command, remember to add it to `bin` in `package.json` — the
binaries only exist because npm generates shims from that field.  
