import os
import shutil
import argparse
import subprocess

from dotenv import load_dotenv

load_dotenv()


storage_path = os.getenv("STORAGE_PATH")
clipboard_file = os.getenv("CLIPBOARD_FILE", ".clipboard")
clipboard_file_path = os.path.join(storage_path, clipboard_file)


def copy_file_to_storage(source_path, storage_path):
    if not os.path.isfile(source_path):
        print(f"Error: Source file not found: {source_path}")
        return

    os.makedirs(storage_path, exist_ok=True)

    filename = os.path.basename(source_path)
    destination = os.path.join(storage_path, filename)

    shutil.copy2(source_path, destination)
    print(f"Copied '{source_path}' to '{destination}'")


def cleanup_previous_file(clipboard_file_path, storage_path):
    """If the clipboard file currently holds a +file[...] reference, delete that file from storage."""
    if not os.path.exists(clipboard_file_path):
        return
    with open(clipboard_file_path, "r") as f:
        content = f.read().strip()
    if content.startswith("+file[") and content.endswith("]"):
        original_path = content[len("+file[") : -1]
        filename = os.path.basename(os.path.expanduser(original_path))
        stored_file = os.path.join(storage_path, filename)
        if os.path.exists(stored_file):
            os.remove(stored_file)
            print(f"Deleted previous file from storage: '{stored_file}'")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Copy text or a file reference to the clipboard file"
    )
    group = parser.add_mutually_exclusive_group(required=False)
    group.add_argument(
        "text", nargs="?", default=None, help="Text to copy to the clipboard file"
    )
    group.add_argument(
        "-f", "--file", required=False, help="Path to the source file to copy"
    )
    args = parser.parse_args()

    if storage_path is None:
        print("Error: STORAGE_PATH not found in .env file")
        exit(1)

    if clipboard_file is None:
        print("Error: CLIPBOARD_FILE not found in .env file")
        exit(1)

    # Clean up previously stored file if clipboard held a +file reference
    cleanup_previous_file(clipboard_file_path, storage_path)

    if args.file is not None:
        # Copy file
        expanded_path = os.path.expanduser(args.file)
        clipboard_content = f"+file[{args.file}]"
        with open(clipboard_file_path, "w") as f:
            f.write(clipboard_content)
        print(
            f"Updated clipboard file at '{clipboard_file_path}' with '{clipboard_content}'"
        )
        if not os.path.exists(expanded_path):
            print(f"Error: File not found: {expanded_path}")
        else:
            copy_file_to_storage(expanded_path, storage_path)
    elif args.text is not None:
        # Copy text
        with open(clipboard_file_path, "w") as f:
            f.write(args.text)
        print(f"Updated clipboard file at '{clipboard_file_path}'")
    else:
        # No args: read from system clipboard
        text = subprocess.run(["pbpaste"], capture_output=True, text=True).stdout
        with open(clipboard_file_path, "w") as f:
            f.write(text)
        print(f"Copied system clipboard to '{clipboard_file_path}'")
