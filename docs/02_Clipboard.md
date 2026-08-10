
`.clipboard`
=============


The `.clipboard` file is the shared clipboard itself — a plain text file whose
contents are whatever was last copied.  


Where it lives
--------------

| Mode    | Location                                                      |
|---------|---------------------------------------------------------------|
| Storage | `STORAGE_PATH/.clipboard` — the folder you chose at setup      |
| Server  | `state/server.clipboard` inside the config directory, on the server |

In storage mode the file name comes from `CLIPBOARD_FILE` and defaults to
`.clipboard`. `tcopy info` prints the resolved path.  


Format
------

Basically it is the content of the clipboard text.  

In storage mode the file holds exactly that text and nothing else:  

```
Hello World
```

In server mode the server prefixes the id of the client that sent the content,
so that clients can ignore their own updates coming back over SSE:  

```
###ID=1775993192###Hello World
```

If things copied is a file, the content is a file reference instead of text.  
File path format: `+file[file_path]`  

```
+file[~/Desktop/a.txt]
```

And in server mode, with the id prefix:  

```
###ID=1775993192###+file[~/Desktop/a.txt]
```

Copying several files at once writes several references separated by spaces:  

```
+file[~/Downloads/a.txt] +file[~/Downloads/b.mp3]
```

The path is recorded exactly as you typed it, `~` included. In storage mode the
file itself is copied next to `.clipboard` under its base name; in server mode
nothing is uploaded — the reference tells the other machine what to request
over P2P.  


Line endings
------------

In storage mode the text is written using `LINE_ENDING_SAVING` (`CRLF` by
default, or `LF` / `CR`). This matters when the storage folder is shared between
Windows and Unix machines. Reading always normalises back, so the value only
affects what is written to disk.  
