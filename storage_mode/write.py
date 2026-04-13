import os
import argparse
import pyperclip


from dotenv import load_dotenv

load_dotenv()


storage_path = os.getenv("STORAGE_PATH")
clipboard_file = os.getenv("CLIPBOARD_FILE")
clipboard_file_path = os.path.join(storage_path, clipboard_file)
line_ending_saving = os.getenv("LINE_ENDING_SAVING", "CRLF")


# If content is None, read from clipboard. Otherwise, use the provided content.
def write_content_to_clipboard(content=None):
    if content is None:
        content = pyperclip.paste()

    file_path = clipboard_file_path

    content_replaced = (
        content.replace("\n", "<LF>")
        .replace("\r", "<CR>")
        .replace("\t", "<TAB>")
        .replace(" ", "<SPACE>")
    )
    print(f"Write content: `{content_replaced}`")

    line_ending = "\r\n"
    if line_ending_saving == "CRLF":
        line_ending = "\r\n"
    elif line_ending_saving == "LF":
        line_ending = "\n"
    elif line_ending_saving == "CR":
        line_ending = "\r"
    else:
        print(
            f"Error: Invalid LINE_ENDING_SAVING value: {line_ending_saving}. Defaulting to CRLF."
        )

    content = content.replace("\r\n", "\n").replace("\r", "\n")
    content = content.replace("\n", line_ending)

    with open(file_path, "w", encoding="utf-8", newline="") as file:
        file.write(content)
        print(f"Content written to {file_path}")
