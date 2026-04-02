#!/bin/bash

# Get the absolute path of the tcopy.sh script
TCOPY_PATH=$(realpath tcopy.sh)

# Check if the tcopy.sh file exists
if [ ! -f "$TCOPY_PATH" ]; then
  echo "tcopy.sh not found in the current directory."
  exit 1
fi

# Define the path to the symlink
SYMLINK_PATH="/usr/local/bin/tcopy"

# Check if the symlink exists
if [ -L "$SYMLINK_PATH" ] || [ -e "$SYMLINK_PATH" ]; then
  echo "Existing 'tcopy' found. Removing it..."
  sudo rm "$SYMLINK_PATH"
fi

# Create the symbolic link in /usr/local/bin
echo "Creating symbolic link for tcopy.sh..."
sudo ln -s "$TCOPY_PATH" "$SYMLINK_PATH"

echo "Installation complete. You can now use 'tcopy' command."