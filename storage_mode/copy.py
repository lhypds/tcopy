import os
import re
import shutil
import argparse
import subprocess

from dotenv import load_dotenv

load_dotenv()


storage_path = os.getenv("STORAGE_PATH")
clipboard_file = os.getenv("CLIPBOARD_FILE", ".clipboard")
clipboard_file_path = os.path.join(storage_path, clipboard_file)
FILE_REF_PATTERN = re.compile(r"\+file\[([^\]]+)\]")
FILE_REF_CONTENT_PATTERN = re.compile(
    r"^\s*(?:\+file\[[^\]]+\])(?:\s+\+file\[[^\]]+\])*\s*$"
)


def copy_file_to_storage(source_path, storage_path):
    if not os.path.isfile(source_path):
        print(f"Error: Source file not found: {source_path}")
        return

    os.makedirs(storage_path, exist_ok=True)

    filename = os.path.basename(source_path)
    destination = os.path.join(storage_path, filename)

    shutil.copy2(source_path, destination)
    print(f"Copied '{source_path}' to '{destination}'")


def parse_file_references(content):
    if not FILE_REF_CONTENT_PATTERN.fullmatch(content):
        return []
    return FILE_REF_PATTERN.findall(content)


def cleanup_previous_file(clipboard_file_path, storage_path):
    """If the clipboard file currently holds +file[...] references, delete those files from storage."""
    if not os.path.exists(clipboard_file_path):
        return
    with open(clipboard_file_path, "r") as f:
        content = f.read().strip()
    for original_path in parse_file_references(content):
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
        "-f",
        "--file",
        nargs="+",
        required=False,
        help="One or more source file paths to copy",
    )
    args = parser.parse_args()

    if storage_path is None:
        print("Error: STORAGE_PATH not found in .env file")
        exit(1)

    if clipboard_file is None:
        print("Error: CLIPBOARD_FILE not found in .env file")
        exit(1)

    if args.file is not None:
        expanded_paths = [os.path.expanduser(file_path) for file_path in args.file]
        missing_files = [
            expanded_path
            for expanded_path in expanded_paths
            if not os.path.exists(expanded_path)
        ]

        if missing_files:
            for missing_file in missing_files:
                print(f"Error: File not found: {missing_file}")
            exit(1)

        # Clean up previously stored file if clipboard held +file references
        cleanup_previous_file(clipboard_file_path, storage_path)

        clipboard_content = " ".join(f"+file[{file_path}]" for file_path in args.file)
        with open(clipboard_file_path, "w") as f:
            f.write(clipboard_content)
        print(
            f"Updated clipboard file at '{clipboard_file_path}' with '{clipboard_content}'"
        )
        for expanded_path in expanded_paths:
            copy_file_to_storage(expanded_path, storage_path)
    elif args.text is not None:
        cleanup_previous_file(clipboard_file_path, storage_path)
        # Copy text
        with open(clipboard_file_path, "w") as f:
            f.write(args.text)
        print(f"Updated clipboard file at '{clipboard_file_path}'")
    else:
        cleanup_previous_file(clipboard_file_path, storage_path)
        # No args: read from system clipboard
        text = subprocess.run(["pbpaste"], capture_output=True, text=True).stdout
        with open(clipboard_file_path, "w") as f:
            f.write(text)
        print(f"Copied system clipboard to '{clipboard_file_path}'")
