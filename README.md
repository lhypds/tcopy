
tcopy
=====


`tcopy`, is a simple text copier for copy text from one machine to another machine.  

Server mode:  
Use server to manage shared text and API to get or update shared text.  
2 machine must both have access to the server.  

File mode:  
Use a txt file as a shared file between two computers.  
2 computers must both have access to the file.  

tcopy command examples:  
`tcopy abc`  
`tcopy -f filename.txt`  
Then on another machine, paste the text.  
For server mode, use `tfetch.py` to get the text from server before paste.  


How It Works
------------

Server mode:  
Local PC clipboard ---  `tpost.py`  --> Server (`clipboard.txt`)  
Local PC clipboard <--  `tfetch.py` --- Server (`clipboard.txt`)  

File mode:  
Local PC clipboard ---  `twrite.py`  --> Shared file (`store.txt`)  
Local PC clipboard <--  `twatch.py`  --- Shared file (`store.txt`)  

* Dependencies  
Python 3  
Node.js  


Setup  
-----

Run `pip install -r requirements.txt` to install the Python dependencies.  
Run `npm install` to install the dependencies for the server.  
Setup `.env` file. (see the `.env` section below)  


Shortcut Setup
--------------

* Keyboard Maestro (macOS)  
Create new action with a custom shortcut.  
Trigger a "Execute Shell Script"  
Example: `cd /Users/username/code/tcopy && /Users/username/.pyenv/shims/python tfetch.py`  

* WinHotKey (Windows)  
<img src="https://github.com/user-attachments/assets/013468fa-7dca-4a9d-bfe5-2d16def43780" width="500">


Linux CLI Support
-----------------

In Linux.  
Use `chmod +x install.sh uninstall.sh tcopy.sh` to add executable permission.  
Use `./install` to install and use command `tcopy` to execute.  
Use `./uninstall` to uninstall it.  

`tcopy` command examples:  
`tcopy aaa`  
`tcopy -f filename.txt`  
`echo aaa | tcopy`  


File Mode  
---------

It will use the txt file as a shared file between two computers.  
2 computers must both have access to the file.  

* Mode setup  
Set `MODE` to `file`.  
Set `STORE` to the path of the txt file.  

* Modules  

1. Sender  
The `twrite.py` will use OS clipboard and save the content to the file (the `STORE`).  
Use AutoHotKey or WinHotKey to trigger the `twrite.py`.  
(I use `Shift + Alt + C` to trigger the `twrite.py`).  
You can also pass content directly: `python twrite.py "hello world"`.  

2. Watcher  
The `twatch.py` will watch and detect the file changes and copy the content to the OS clipboard automatically.  


Server Mode
-----------

It will use server to manage shared text and API to get or update shared text.  
2 machine must both have access to the server.  

* Server deployment setup  
Set `PORT`. (optional)  
Run `npm install` to install the dependencies for the server.  
Run `node serve.js` to start the server.  

* Client setup  
Set `MODE` to `server`.  
Set `STORE` to the URL of the server.  

* Modules

1. Sender (`tpost.py`)  
Get the clipboard content and send it to the server.  
Use AutoHotKey or WinHotKey to trigger the `tpost.py`.  
(I use `Shift + Alt + C` to trigger the `tpost.py`).  
You can also pass content directly: `python tpost.py "hello world"`.  

2. Fetcher (`tfetch.py`)  
Get the content from server with GET API, and save to clipboard.  
Use AutoHotKey or WinHotKey to trigger the `tfetch.py`.  
(I use `Shift + Alt + V` to trigger the `tfetch.py`).  

* Server API  

GET `/`  
Server simply read the file and send the content as response.  

POST `/`  
The client will send the content in request body to the server.  
The server will save the content to a file.  


.env
----

MODE  
`file` or `server` mode setup.  

STORE  
Local store file name.  
Example: `store.txt`  
Remote server URL.  
Example: `https://tcopy.abc.com`  

LINE_ENDING_SAVING  
Line ending for saving.  
Use `LF`, `CRLF` or `CR`.  
`LF` for Unix/Linux. (LF, line feed)  
`CRLF` for Windows style. (CRLF, carriage return and line feed)  
`CR` for macOS style. (CR, carriage return)  

PORT  
Server port number for `serve.js`.    

PM2_NAME  
PM2 process name.  
