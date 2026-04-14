
tcopy: Storage Mode
===================

Copy text or file through a file in shared storage.  


Components
----------

1. `copy.py`  

Read text from local clipboard and write to the storage's clipboard file.  
`copy.py`  

Write the <text> to the storage's clipboard file.  
`copy.py <text>`  

Copy the file at <file_path> to the storage and write a reference to it in the clipboard file.  
`copy.py [-f|--file] <file_path>`  
Clipboard text example:  
`+file[~/Documents/report.pdf]`  

2. `paste.py`  

Read the clipboard file and paste to local clipboard.  
`paste.py`  

paste the referenced file to current directory.  
`paste.py [-f|--file]`  

Read the clipboard file and paste the referenced file to <target_path>.  
`paste.py [-f|--file] <target_path>`


Watcher
-------

Watch the clipboard file changes and automatically sync to local clipboard.

To start the watcher, run:  
`python watcher.py`  
