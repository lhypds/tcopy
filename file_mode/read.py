import os
import pyperclip
from dotenv import load_dotenv


load_dotenv()


def read_file_to_clipboard(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        content = file.read()
    pyperclip.copy(content)
    print(f"Content copied to clipboard from {file_path}")


if __name__ == "__main__":
    clipboard_file_path = os.getenv("CLIPBOARD_FILE_PATH")

    if clipboard_file_path is None:
        print("Error: CLIPBOARD_FILE_PATH not found in .env file")
    elif not os.path.exists(clipboard_file_path):
        print(f"Error: File not found: {clipboard_file_path}")
    else:
        read_file_to_clipboard(clipboard_file_path)
