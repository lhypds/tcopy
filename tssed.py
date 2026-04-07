import os
import json
import time
import requests
import pyperclip
from dotenv import load_dotenv

load_dotenv()

HEARTBEAT_TIMEOUT_SECONDS = 5 * 60


def connect_and_watch_events(url):
    """Connect to SSE endpoint and update clipboard on content changes."""
    last_heartbeat = time.time()

    while True:
        try:
            print(f"Connecting to SSE endpoint: {url}/sse")
            response = requests.get(f"{url}/sse", stream=True, timeout=HEARTBEAT_TIMEOUT_SECONDS + 60)
            response.raise_for_status()

            last_heartbeat = time.time()

            for line in response.iter_lines(chunk_size=1, decode_unicode=True):
                if not line:
                    continue

                line = line.decode('utf-8') if isinstance(line, bytes) else line

                if line.startswith('data: '):
                    try:
                        json_str = line[6:]  # Remove 'data: ' prefix
                        data = json.loads(json_str)
                        text = data.get('text', '')

                        # Update heartbeat time for any message
                        last_heartbeat = time.time()

                        # Skip ###ALIVE### messages, only process actual content
                        if text == '###ALIVE###':
                            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Heartbeat received")
                            continue

                        # Copy content to clipboard
                        print(f"Received content, updating clipboard...")
                        content_replaced = text.replace('\n', "<LF>").replace('\r', "<CR>").replace('\t', "<TAB>").replace(' ', "<SPACE>")
                        print(f"Content: `{content_replaced}`")
                        pyperclip.copy(text)
                        print("Content copied to clipboard successfully.")

                    except json.JSONDecodeError as e:
                        print(f"Error parsing JSON: {e}")
                        continue

                # Check if heartbeat timeout
                time_since_heartbeat = time.time() - last_heartbeat
                if time_since_heartbeat > HEARTBEAT_TIMEOUT_SECONDS:
                    print(f"No heartbeat received for {HEARTBEAT_TIMEOUT_SECONDS} seconds. Reconnecting...")
                    break

        except requests.exceptions.Timeout:
            print("Connection timeout. Reconnecting...")
            time.sleep(2)
        except requests.exceptions.ConnectionError as e:
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
