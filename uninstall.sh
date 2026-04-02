#!/bin/bash

# Define the path to the symlink
SYMLINK_PATH="/usr/local/bin/tcopy"

# Check if the symlink exists
if [ -L "$SYMLINK_PATH" ]; then
  # Remove the symbolic link
  echo "Removing symbolic link for tcopy..."
  sudo rm "$SYMLINK_PATH"
  echo "Uninstallation complete. The 'tcopy' command has been removed."
else
  echo "The 'tcopy' command is not installed, or the symlink does not exist."
fi
