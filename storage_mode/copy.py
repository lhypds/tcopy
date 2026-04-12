import os
import shutil
import argparse

from dotenv import load_dotenv

load_dotenv()


def copy_file_to_storage(source_path, storage_path):
    if not os.path.isfile(source_path):
        print(f"Error: Source file not found: {source_path}")
        return

    os.makedirs(storage_path, exist_ok=True)

    filename = os.path.basename(source_path)
    destination = os.path.join(storage_path, filename)

    shutil.copy2(source_path, destination)
    print(f"Copied '{source_path}' to '{destination}'")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Copy a file to the storage path")
    parser.add_argument(
        "-f", "--file", required=True, help="Path to the source file to copy"
    )
    args = parser.parse_args()

    storage_path = os.getenv("STORAGE_PATH")

    if storage_path is None:
        print("Error: STORAGE_PATH not found in .env file")
    else:
        copy_file_to_storage(args.file, storage_path)
