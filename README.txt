
txtcopier
=========


MODE 1. Simple Txt File Copier
------------------------------

Set `STORE_TYPE` to `file`.
Set `STORE_FILE` to the path of the txt file.

It will use the txt file as a shared file between two computers.
The `txtsender.py` will use OS clipboard and save the content to a file.
The `txtwatcher.py` will watch the file and copy the content to the OS clipboard.

Use python virtual environment.
Run `python -m venv .venv` to create python virtual environment.
Run `.venv\Scripts\activate` to enable the envrionment.
Then run `pip install -r requirements.txt`

Run `start.bat` to start the reciever.
Use AutoHotKey or WinHotKey to trigger the sender.
(I use `Shift + Alt + C` to trigger the sender).


MODE 2. Client / Server Copier
------------------------------

Set `STORE_TYPE` to `server`.
Set `STORE_URL` to the URL of the server.

Save
The client will send the content as query parameter of a GET request to the server.
The server will save the content to a file.

Get
Server simply read the file and send the content as response.

Reciever