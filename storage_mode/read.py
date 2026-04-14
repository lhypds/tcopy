import os
import pyperclip


from dotenv import load_dotenv

load_dotenv()


storage_path = os.getenv("STORAGE_PATH")
clipboard_file = os.getenv("CLIPBOARD_FILE")
clipboard_file_path = os.path.join(storage_path, clipboard_file)


def read_content_from_clipboard():
    file_path = clipboard_file_path

    if not os.path.exists(file_path):
        print(f"Error: Clipboard file not found: {file_path}")
        return None

    with open(file_path, "r", encoding="utf-8", newline="") as file:
        content = file.read()

    # Normalize line endings to \n
    content = content.replace("\r\n", "\n").replace("\r", "\n")

    content_replaced = (
        content.replace("\n", "<LF>")
        .replace("\r", "<CR>")
        .replace("\t", "<TAB>")
        .replace(" ", "<SPACE>")
    )
    print(f"Read content: `{content_replaced}`")

    pyperclip.copy(content)
    print(f"Content copied to system clipboard from {file_path}")

    return content
