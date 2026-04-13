import os
import shutil
import argparse

from dotenv import load_dotenv

load_dotenv()

CLIPBOARD_FILE = os.getenv("CLIPBOARD_FILE", ".clipboard")
EXCLUDE_FILES = {CLIPBOARD_FILE}


def paste_files_to_target(storage_path, target_path):
    if not os.path.isdir(storage_path):
        print(f"Error: Storage path not found: {storage_path}")
        return

    os.makedirs(target_path, exist_ok=True)

    moved = 0
    for filename in os.listdir(storage_path):
        if filename in EXCLUDE_FILES:
            continue

        source = os.path.join(storage_path, filename)
        if not os.path.isfile(source):
            continue

        destination = os.path.join(target_path, filename)
        shutil.move(source, destination)
        print(f"Moved '{source}' to '{destination}'")
        moved += 1

    if moved == 0:
        print("No files to paste.")
    else:
        print(f"Pasted {moved} file(s) to '{target_path}'")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Paste files from storage path to target"
    )
    parser.add_argument("-f", "--file", required=True, help="Target directory path")
    args = parser.parse_args()

    storage_path = os.getenv("STORAGE_PATH")

    if storage_path is None:
        print("Error: STORAGE_PATH not found in .env file")
    else:
        paste_files_to_target(storage_path, args.file)
