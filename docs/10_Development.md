
Development
===========


Setup
-----

```
git clone https://github.com/lhypds/tcopy
cd tcopy
./install.sh        # install.bat on Windows
```

The installer links the checkout onto your PATH rather than copying it, so edits
take effect immediately — there is nothing to reinstall after a change. For the
same reason `tcopy update` just runs `git pull`.  

To remove the commands again, run `./uninstall.sh` (`npm rm -g tcopy` on
Windows). It keeps your configuration unless you pass `--purge`.  


Layout
------

```
tcopy         # ── bin/tcopy.js
tpaste        # ── bin/tpaste.js      thin entry points
fcopy         # ── bin/fcopy.js
fpaste        # ── bin/fpaste.js

cli.js          command dispatch, shared by all four
config.js       config directory, .env read/write, 0.0.x migration
daemon.js       start/stop/status for the background process
utils/          file-reference parsing, prompts
storage_mode/   copy, paste and the clipboard-file watcher
server_mode/    client, server and the PeerJS file transfer
```


Adding a command
----------------

Both modes take the same argument shape internally: a bare value is text, a
leading `-f` means files. `fcopy` and `fpaste` add that flag for you, which is
why the two modes need no special-casing.  

If you add a command, remember to add it to `bin` in `package.json` — the
binaries only exist because npm generates shims from that field.  


Configuration while developing
------------------------------

Set `TCOPY_CONFIG_DIR` to point at a scratch directory. That keeps test runs
away from your real configuration in `~/.config/tcopy/`:  

```
export TCOPY_CONFIG_DIR=/tmp/tcopy-test
tcopy setup
```
