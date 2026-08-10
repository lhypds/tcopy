
Management Commands
===================


Everything that is not copy/paste lives under `tcopy`.  

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


`setup`
-------

Asks for the mode, then for whatever that mode needs: the storage folder for
storage mode, or the environment (`server`/`client`) for server mode — followed
by the server URL for a client or the port for a server, and then the pm2
process name for either. Writes the answers to the config directory. Run it
again at any time to reconfigure.  


`start`, `stop`, `restart`
--------------------------

These manage one background process, and which one depends on the mode:  

| Mode                        | Process                                   |
|-----------------------------|-------------------------------------------|
| Storage                     | The clipboard-file watcher                |
| Server, `ENVIRONMENT=server`| The tcopy server                          |
| Server, `ENVIRONMENT=client`| The tcopy client                          |

The process is detached, so it keeps running after the terminal closes. Its
output goes to a log file in the state directory — `tcopy start` prints the
path. `start` is idempotent: running it twice reports the existing process
rather than starting a second one.  


`info`
------

Prints the version, the config directory, the current mode, the mode's key
settings, and whether the background process is running.  


`clear` and `reset`
-------------------

`clear` deletes runtime files — logs, pid files and the clipboard file. Files
you copied in storage mode are left alone.  

`reset` stops the background process, does everything `clear` does, and then
restores the configuration files to their defaults. You will need to run
`tcopy setup` again afterwards.  


`update`
--------

In a git checkout this runs `git pull`. Because `./install.sh` links the
checkout onto your PATH instead of copying it, the commands are up to date
immediately — there is nothing to reinstall.  
