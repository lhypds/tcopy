# `tcopy` client, connects to `tcopy` server's SSE endpoint and updates clipboard on content changes. Written in Python using `requests` for SSE connection.

import os
import json
import time
import requests
import pyperclip
from dotenv import load_dotenv

load_dotenv()

HEARTBEAT_TIMEOUT_SECONDS = 40


def connect_and_watch_events(url):
    """Connect to SSE endpoint and update clipboard on content changes."""
    while True:
        try:
            print(f"Connecting to SSE endpoint: {url}/sse")
            with requests.get(
                f"{url}/sse",
                stream=True,
                timeout=(10, HEARTBEAT_TIMEOUT_SECONDS),
            ) as response:
                response.raise_for_status()

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
                                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Heartbeat received.")
                                continue

                            # Copy content to clipboard
                            print("Received content, updating clipboard...")
                            content_replaced = text.replace('\n', "<LF>").replace('\r', "<CR>").replace('\t', "<TAB>").replace(' ', "<SPACE>")
                            print(f"Content: `{content_replaced}`")
                            pyperclip.copy(text)
                            print("Content copied to clipboard successfully.")

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

    store = os.getenv('STORE')

    if store is None:
        print("Error: STORE not found in .env file")
    else:
        connect_and_watch_events(store)
