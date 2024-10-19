
txtcopier
=========


![image](https://github.com/user-attachments/assets/fec4f88d-1b45-4ab5-a0c4-ccebc0b77aa3)


Setup
-----

`pip install -r requirements.txt` to install the dependencies.  
`npm install` to install the dependencies for the server.  


MODE 1. Simple Txt File Copier
------------------------------

It will use the txt file as a shared file between two computers.  
2 computers must have access to the file.  

* Mode setup  
Set `STORE_TYPE` to `file`.  
Set `STORE_FILE` to the path of the txt file.  

The `txtsender.py` will use OS clipboard and save the content to a file.  
The `txtwatcher.py` will watch the file and copy the content to the OS clipboard.  

Run `start.bat` to start the watcher.  
Use AutoHotKey or WinHotKey to trigger the sender.  
(I use `Shift + Alt + C` to trigger the sender).  


MODE 2. Client / Server Copier
------------------------------

With this simple copier, you don't need to think about the clipboard.  
Just press `Ctrl + C` to copy the content, `Shift + Alt + C` to send to server.  
In another machine, use `Shift + Alt + V` to get the content, then `Ctrl + V` to paste.  

* Mode setup  
Set `STORE_TYPE` to `server`.  
Set `STORE_URL` to the URL of the server.  

Sender (`txtsender.py`)  
Automatically use the clipboard to get the content and send it to the server.  

Reciever (`txtreciever.py`)  
Use AutoHotKey or WinHotKey to trigger the reciever.  
(I use `Shift + Alt + C` to trigger the sender).  

* Server API  

GET `/`  
Server simply read the file and send the content as response.  

GET `/save`  
The client will send the content as query parameter of a GET request to the server.  
The server will save the content to a file.
