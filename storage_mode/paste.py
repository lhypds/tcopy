import os
import shutil
import argparse

from dotenv import load_dotenv
from read import read_content_from_clipboard

load_dotenv()

storage_path = os.getenv("STORAGE_PATH")
clipboard_file = os.getenv("CLIPBOARD_FILE", ".clipboard")
clipboard_file_path = os.path.join(storage_path, clipboard_file)
EXCLUDE_FILES = {clipboard_file}


def get_clipboard_content():
    if not os.path.exists(clipboard_file_path):
        print(f"Error: Clipboard file not found: {clipboard_file_path}")
        return None
    with open(clipboard_file_path, "r", encoding="utf-8") as f:
        return f.read().strip()


def paste_file_from_storage(file_ref, target_path):
    """Move the file referenced in clipboard (+file[...]) from storage to target_path."""
    filename = os.path.basename(os.path.expanduser(file_ref))
    source = os.path.join(storage_path, filename)

    if not os.path.isfile(source):
        print(f"Error: File not found in storage: '{source}'")
        return

    if os.path.isdir(target_path):
        destination = os.path.join(target_path, filename)
    else:
        os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)
        destination = target_path

    shutil.move(source, destination)
    print(f"Moved '{source}' to '{destination}'")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Paste text or file from clipboard storage"
    )
    parser.add_argument(
        "-f",
        "--file",
        nargs="?",
        const=".",
        default=None,
        metavar="PATH",
        help="Paste stored file to PATH (default: current directory)",
    )
    args = parser.parse_args()

    if storage_path is None:
        print("Error: STORAGE_PATH not found in .env file")
        exit(1)

    content = get_clipboard_content()
    if content is None:
        exit(1)

    is_file_ref = content.startswith("+file[") and content.endswith("]")

    if args.file is not None:
        # -f flag given: paste file from storage
        if not is_file_ref:
            print("Error: Clipboard does not contain a file reference.")
            exit(1)
        target = os.path.expanduser(args.file)
        file_ref = content[len("+file[") : -1]
        paste_file_from_storage(file_ref, target)
    else:
        # No -f: paste text to system clipboard
        if is_file_ref:
            print(
                "Error: Clipboard contains a file reference. Use -f to paste the file."
            )
            exit(1)
        read_content_from_clipboard()
