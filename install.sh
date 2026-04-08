#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TCOPY_PATH="$SCRIPT_DIR/tcopy.sh"

# Check if the tcopy.sh file exists
if [ ! -f "$TCOPY_PATH" ]; then
  echo "tcopy.sh not found at: $TCOPY_PATH"
  exit 1
fi

# Define the path to the symlink
SYMLINK_PATH="/usr/local/bin/tcopy"

# Check if the symlink exists
if [ -L "$SYMLINK_PATH" ] || [ -e "$SYMLINK_PATH" ]; then
  echo "Existing 'tcopy' found. Removing it..."
  sudo rm "$SYMLINK_PATH"
fi

# Create a launcher in /usr/local/bin that points to the real script path
echo "Installing launcher for tcopy..."
sudo tee "$SYMLINK_PATH" > /dev/null <<EOF
#!/bin/bash
exec bash "$TCOPY_PATH" "\$@"
EOF

sudo chmod +x "$SYMLINK_PATH"

echo "Installation complete. You can now use 'tcopy' command."
