# `tcopy` client, connects to `tcopy` server's SSE endpoint and updates clipboard on content changes. Written in Python using `requests` for SSE connection.

import os
import json
import time
import requests
import pyperclip
from dotenv import load_dotenv

load_dotenv()

HEARTBEAT_TIMEOUT_SECONDS = 40


def connect_and_watch_events(base_url):
    """Connect to SSE endpoint and update clipboard on content changes."""
    while True:
        try:
            with requests.get(
                f"{base_url}/sse",
                stream=True,
                timeout=(10, HEARTBEAT_TIMEOUT_SECONDS),
            ) as response:
                response.raise_for_status()
                print(f"Connected to SSE endpoint: {base_url}/sse")

                for line in response.iter_lines(decode_unicode=True):
                    if not line:
                        continue

                    if line.startswith('data: '):
                        try:
                            json_str = line[6:]  # Remove 'data: ' prefix
                            data = json.loads(json_str)
                            text = data.get('text', '')

                            # Skip ###ALIVE### messages, only process actual content
                            if text == '###ALIVE###':
                                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Heartbeat.")
                                continue

                            # Copy content to clipboard
                            print("Received content, updating clipboard...")
                            content_replaced = text.replace('\n', "<LF>").replace('\r', "<CR>").replace('\t', "<TAB>").replace(' ', "<SPACE>")
                            pyperclip.copy(text)
                            print(f"Content copied: `{content_replaced}`")

                        except json.JSONDecodeError as e:
                            print(f"Error parsing JSON: {e}")
                            continue

        except requests.exceptions.Timeout:
            print(f"No heartbeat received for {HEARTBEAT_TIMEOUT_SECONDS} seconds. Reconnecting...")
            time.sleep(2)
        except requests.exceptions.ConnectionError as e:
            if 'Read timed out' in str(e):
                print(f"No heartbeat received for {HEARTBEAT_TIMEOUT_SECONDS} seconds. Reconnecting...")
            else:
                print(f"Connection error: {e}. Reconnecting...")
            time.sleep(2)
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}. Reconnecting...")
            time.sleep(2)
        except KeyboardInterrupt:
            print("Stopped by user.")
            break
        except Exception as e:
            print(f"Unexpected error: {e}. Reconnecting...")
            time.sleep(2)


if __name__ == "__main__":
    load_dotenv()

    base_url = os.getenv('SERVER_BASE_URL')

    if base_url is None:
        print("Error: SERVER_BASE_URL not found in .env file")
    else:
        connect_and_watch_events(base_url)
