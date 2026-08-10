
tcopy
=====


`tcopy` is originally for only copying text, so I called it `tcopy`, it can copy files as well.  

Support macOS, Windows and Linux.  
So, if the P2P not blocked by your NAT, basically it can copy any file from any machine to any machine.  

In my test, the file transfer speed can reach 65MB/s.  


Install
-------

Requirements: Node.js 18 or newer. Nothing else — no Python, no pm2.  

macOS and Linux:  

```
git clone https://github.com/lhypds/tcopy
cd tcopy
./install.sh
```

Windows:  

```
git clone https://github.com/lhypds/tcopy
cd tcopy
install.bat
```

This installs the dependencies and puts the four commands — `tcopy`, `tpaste`,
`fcopy`, `fpaste` — on your PATH. On Windows npm generates `.cmd` and `.ps1`
shims, so they work the same in cmd, PowerShell and Git Bash.  

Then run the interactive setup:  

```
tcopy setup
```

To remove it again, run `./uninstall.sh` (or `npm rm -g tcopy` on Windows).
Your configuration is kept unless you pass `--purge`.  


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


Documentation
-------------

| Document | Contents |
|----------|----------|
| [Modes](docs/05_Modes.md)                | Server mode vs storage mode, and how text and files move in each |
| [Commands](docs/04_Commands.md)           | Management commands — `setup`, `start`, `stop`, `restart`, `info`, `clear`, `reset`, `update` |
| [Configuration](docs/03_Configuration.md) | Every setting, where it is stored, and the runtime state directory |
| [Clipboard](docs/02_Clipboard.md)         | The `.clipboard` file — where it lives and its format |
| [Shortcut](docs/01_Shortcut.md)           | Binding a system-wide keyboard shortcut |
| [Development](docs/10_Development.md)     | Project layout, and working on `tcopy` locally |
