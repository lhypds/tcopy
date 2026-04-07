import os
import argparse
import pyperclip
import requests
from dotenv import load_dotenv


load_dotenv()


def post_content_to_server(url, content=None):
    if content is None:
        content = pyperclip.paste()

    content_replaced = content.replace("\n", "<LF>").replace("\r", "<CR>").replace("\t", "<TAB>").replace(" ", "<SPACE>")
    print(f"Content: {content_replaced}")

    print(f"Sending POST request to `{url}`.")
    response = requests.post(url, json={"text": content_replaced})
    print(f"Server response: `{response.text}`")

    if response.status_code == 200:
        print(f"Clipboard content sent successfully.")
    else:
        print(f"Failed to send clipboard content. Status code: {response.status_code}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send text to tcopy server")
    parser.add_argument("content", nargs="*", help="Text content to send. If omitted, clipboard content is used.")
    args = parser.parse_args()

    url = os.getenv("STORE")

    if url is None:
        print("Error: STORE not found in .env file")
    else:
        content = " ".join(args.content).strip() if args.content else None
        post_content_to_server(url, content)
