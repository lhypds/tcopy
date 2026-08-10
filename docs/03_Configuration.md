
tcopy: Configuration
====================


Configuration and runtime state live in a per-user directory, not in the
checkout, so pulling or reinstalling never touches your settings.  

| Platform      | Location                          |
|---------------|-----------------------------------|
| macOS / Linux | `~/.config/tcopy/`                |
| Windows       | `%APPDATA%\tcopy\`                |

On macOS and Linux `XDG_CONFIG_HOME` is honoured if set. Set
`TCOPY_CONFIG_DIR` to override the location entirely — useful for testing
against a throwaway configuration.  

`tcopy info` prints the resolved paths.  


Files
-----

| File            | Purpose                                     |
|-----------------|---------------------------------------------|
| `tcopy.env`     | `MODE` — `server` or `storage`               |
| `server.env`    | Server mode settings                         |
| `storage.env`   | Storage mode settings                        |
| `state/`        | Logs, pid files, peer ids, clipboard file    |

They are plain `KEY=value` files. `#` starts a comment, and values are never
interpolated, so a Windows path like `C:\Users\me` stays intact.  

Normally you do not edit them by hand — `tcopy setup` writes them for you.  


`tcopy.env`
-----------

| Key    | Default | Description                       |
|--------|---------|-----------------------------------|
| `MODE` | *(unset)* | `server` or `storage`. Asked on first use if empty. |


`server.env`
------------

| Key                  | Default   | Description                                        |
|----------------------|-----------|----------------------------------------------------|
| `ENVIRONMENT`        | *(unset)* | `server` or `client` — the role of this machine     |
| `SERVER_BASE_URL`    | *(unset)* | Client only. e.g. `http://localhost:5460`           |
| `PORT`               | `5460`    | Port the server listens on (the client's local port defaults to 5461) |
| `DEBUG`              | `false`   | `true` also writes `debug` level lines to the logs  |

Line endings are not converted in server mode — the text is relayed as-is.
`LINE_ENDING_SAVING` only applies to storage mode.  


`storage.env`
-------------

| Key                  | Default      | Description                                    |
|----------------------|--------------|------------------------------------------------|
| `STORAGE_PATH`       | `state/storage` | The shared folder. Set this to your synced folder. |
| `CLIPBOARD_FILE`     | `.clipboard` | Name of the clipboard file inside it            |
| `LINE_ENDING_SAVING` | `CRLF`       | `CRLF`, `LF` or `CR` — see [02_Clipboard.md](02_Clipboard.md) |

`STORAGE_PATH` is stored as an absolute path. A relative value is resolved
against the state directory, never the working directory, so the storage
location does not change depending on where you run the command from.  


`state/`
--------

Runtime artifacts, safe to delete — `tcopy clear` removes them for you.  

| File                | Written by                                  |
|---------------------|---------------------------------------------|
| `<name>.pid`        | The background process (`watch`, `server`, `client`) |
| `<name>.log`        | Its captured output                          |
| `server-app.log`, `client-app.log`, `peer.log` | The application loggers   |
| `server-id`, `client-id` | Peer ids used to identify machines      |
| `server.clipboard`  | The clipboard file, server mode only         |
| `storage/`          | Default storage folder, if `STORAGE_PATH` is unset |


Upgrading from 0.0.x
--------------------

The old `.env` files inside the checkout are migrated automatically the first
time you run any command. `PM2_NAME` is dropped, and a relative `STORAGE_PATH`
is reset to the default because it used to be relative to `storage_mode/`, a
directory that no longer exists.  
