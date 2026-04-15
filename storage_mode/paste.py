import os
import re
import shutil
import argparse

from dotenv import load_dotenv
from read import read_content_from_clipboard

load_dotenv()

storage_path = os.getenv("STORAGE_PATH")
clipboard_file = os.getenv("CLIPBOARD_FILE", ".clipboard")
clipboard_file_path = os.path.join(storage_path, clipboard_file)
EXCLUDE_FILES = {clipboard_file}
FILE_REF_PATTERN = re.compile(r"\+file\[([^\]]+)\]")
FILE_REF_CONTENT_PATTERN = re.compile(
    r"^\s*(?:\+file\[[^\]]+\])(?:\s+\+file\[[^\]]+\])*\s*$"
)


def get_clipboard_content():
    if not os.path.exists(clipboard_file_path):
        print(f"Error: Clipboard file not found: {clipboard_file_path}")
        return None
    with open(clipboard_file_path, "r", encoding="utf-8") as f:
        return f.read().strip()


def parse_file_references(content):
    if not FILE_REF_CONTENT_PATTERN.fullmatch(content):
        return []
    return FILE_REF_PATTERN.findall(content)


def paste_file_from_storage(file_ref, target_path):
    """Copy the file referenced in clipboard (+file[...]) from storage to target_path."""
    filename = os.path.basename(os.path.expanduser(file_ref))
    source = os.path.abspath(os.path.join(storage_path, filename))

    if not os.path.isfile(source):
        print(f"Error: File not found in storage: '{source}'")
        return False

    if os.path.isdir(target_path):
        destination = os.path.abspath(os.path.join(target_path, filename))
    else:
        os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)
        destination = os.path.abspath(target_path)

    if os.path.exists(destination) and os.path.samefile(source, destination):
        print(
            f"Skip copying because source and destination are the same file: '{source}'"
        )
        return True

    shutil.copy2(source, destination)
    print(f"Copied '{source}' to '{destination}'")
    return True


def paste_files_from_storage(file_refs, target_path):
    expanded_target_path = os.path.expanduser(target_path)

    if not os.path.exists(expanded_target_path):
        print(f"Error: Target directory does not exist: '{expanded_target_path}'")
        return False

    if not os.path.isdir(expanded_target_path):
        print(f"Error: Target path is not a directory: '{expanded_target_path}'")
        return False

    for file_ref in file_refs:
        if not paste_file_from_storage(file_ref, expanded_target_path):
            return False

    return True


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
        help="Paste stored file(s) to an existing directory PATH (default: current directory)",
    )
    args = parser.parse_args()

    if storage_path is None:
        print("Error: STORAGE_PATH not found in .env file")
        exit(1)

    content = get_clipboard_content()
    if content is None:
        exit(1)

    file_refs = parse_file_references(content)
    is_file_ref = len(file_refs) > 0

    if args.file is not None:
        # -f flag given: paste file from storage
        if not is_file_ref:
            print("Error: Clipboard does not contain a file reference.")
            exit(1)
        target = os.path.expanduser(args.file)
        if not paste_files_from_storage(file_refs, target):
            exit(1)
    else:
        # No -f: paste text to system clipboard
        if is_file_ref:
            print(
                "Error: Clipboard contains a file reference. Use -f to paste the file."
            )
            exit(1)
        read_content_from_clipboard()
