
txtcopier
=========


Simple text copier for copy text from one machine to another machine.  

2 modes are providered:
1. File mode use a file as text cache.  
2. Server mode store text cache on server, and use API to access.  


![image](https://github.com/user-attachments/assets/fec4f88d-1b45-4ab5-a0c4-ccebc0b77aa3)


Dependencies
------------

Python 3  
Node.js  


Setup  
-----

Run `pip install -r requirements.txt` to install the Python dependencies.  
Run `npm install` to install the dependencies for the server.  

* Line ending
In `.env` file set the line ending. (`LINE_ENDING_SAVING`).  
`\n` for Unix/Linux. (LF, line feed)  
`\r\n` for Windows style. (CRLF, carriage return and line feed)  
`\r` for macOS style. (CR, carriage return)  


File Mode  
---------

It will use the txt file as a shared file between two computers.  
2 computers must both have access to the file.  

* Mode setup  
Set `STORE_TYPE` to `file`.  
Set `STORE_FILE` to the path of the txt file.  

* Modules  

1. Sender  
The `txtsender.py` will use OS clipboard and save the content to the file (the `STORE_FILE`).  
Use AutoHotKey or WinHotKey to trigger the `txtsender.py` or `send.bat`.  
(I use `Shift + Alt + C` to trigger the `send.bat`).  

2. Watcher  
The `txtwatcher.py` will watch and detect the file changes and copy the content to the OS clipboard automatically.  
Run `start.bat` to start the watcher.  


Server Mode
-----------

It will use server to manage shared text and API to get or update shared text.  
2 machine must both have access to the server.  

* Server deployment setup  
Set `PORT`. (optional)  
Run `npm install` to install the dependencies for the server.  
Run `node server.js` to start the server.  

* Client setup  
Set `STORE_TYPE` to `server`.  
Set `STORE_URL` to the URL of the server.  

* Modules

1. Sender (`txtsender.py`)  
Automatically get the clipboard content and send it to the server.  3
Use AutoHotKey or WinHotKey to trigger the `txtsender.py` or `send.bat`.  
(I use `Shift + Alt + C` to trigger the `send.bat`).  

2. Reciever (`txtreciever.py`)  
Get the content from server with GET API, and save to clipboard.  
Use AutoHotKey or WinHotKey to trigger the `txtreciever.py` or `recieve.bat`.  
(I use `Shift + Alt + V` to trigger the `recieve.bat`).  

* Server API  

GET `/`  
Server simply read the file and send the content as response.  

GET `/save`  
The client will send the content as query parameter of a GET request to the server.  
The server will save the content to a file.  


Hotkey Setup
------------

Example:  

<img src="https://github.com/user-attachments/assets/013468fa-7dca-4a9d-bfe5-2d16def43780" width="500">

