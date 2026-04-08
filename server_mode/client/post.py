import os
import time
import argparse
import pyperclip
import requests


from dotenv import load_dotenv

load_dotenv()


# If content is None, it will read from clipboard and send to server.
def post_content(url, content=None):
    if content is None:
        content = pyperclip.paste()

    content_replaced = (
        content.replace("\n", "<LF>")
        .replace("\r", "<CR>")
        .replace("\t", "<TAB>")
        .replace(" ", "<SPACE>")
    )
    print(f"Send content: `{content_replaced}`")

    print(f"Sending POST request to `{url}`.")
    timeout_seconds = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "5"))

    # Get id
    script_dir = os.path.dirname(os.path.abspath(__file__))
    id_path = os.path.join(script_dir, "id")
    try:
        with open(id_path, "r", encoding="utf-8") as f:
            id = f.read().strip()
    except FileNotFoundError:
        id = ""

    timestamp = str(int(time.time()))
    try:
        response = requests.post(
            url,
            json={"id": id, "text": content_replaced, "timestamp": timestamp},
            timeout=timeout_seconds,
        )
    except requests.exceptions.ConnectionError:
        print("Error: Cannot connect to server.")
        return False
    except requests.exceptions.Timeout:
        print(f"Error: Request timed out after {timeout_seconds} seconds.")
        return False
    except requests.RequestException as error:
        print(f"Error: Failed to send content: {error}")
        return False

    print(f"Server response: `{response.text}`")

    if response.status_code == 200:
        print(f"Clipboard content sent successfully.")
        return True
    else:
        print(f"Failed to send clipboard content. Status code: {response.status_code}")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send text to tcopy server")
    parser.add_argument(
        "content",
        nargs="*",
        help="Text content to send. If omitted, clipboard content is used.",
    )
    args = parser.parse_args()

    server_base_url = os.getenv("SERVER_BASE_URL")

    if server_base_url is None:
        print("Error: SERVER_BASE_URL not found in .env file")
    else:
        content = " ".join(args.content).strip() if args.content else None
        success = post_content(server_base_url, content)
        if not success:
            raise SystemExit(1)
