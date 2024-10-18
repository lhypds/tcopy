import pyperclip
import os
from dotenv import load_dotenv

def write_clipboard_to_file(file_path):
    # Get the current clipboard content
    clipboard_content = pyperclip.paste()

    # Write the clipboard content to the file
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(clipboard_content)
        print(f"Clipboard content written to {file_path}")

if __name__ == "__main__":
    # Load environment variables from .env file
    load_dotenv()

    # Get the file path from the STORE_PATH environment variable
    file_path = os.getenv('STORE_PATH')

    if file_path is None:
        print("Error: STORE_PATH not found in .env file")
    else:
        # Write clipboard content to the specified file path
        write_clipboard_to_file(file_path)