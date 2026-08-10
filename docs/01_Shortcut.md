
Shortcut Setup
==============


Bind a system-wide keyboard shortcut so copying and pasting between machines
does not need a terminal.  

The two worth binding are `tcopy` (send the current clipboard) and `tpaste`
(fetch the remote clipboard) — together they behave like a networked Cmd-C /
Cmd-V. `fcopy` and `fpaste` take a path argument, so they are usually better
left in the terminal.  


* Windows  

Use like WinHotKey, pointing at `tcopy`.  

* macOS  

Keyboard Maestro  
Create new action with a custom shortcut.  
Trigger a "Execute Shell Script" to execute `tcopy`.  

* Linux  

Use system settings to set up a custom shortcut to execute `tcopy`.  


Note
----

A shortcut runs the command without your shell's startup files, so `tcopy` may
not be on its PATH. If the shortcut does nothing, use the absolute path — run
`which tcopy` (`where tcopy` on Windows) and paste the full path into the
shortcut instead.  
