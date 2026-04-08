# `tcopy` client, connects to `tcopy` server's SSE endpoint and updates clipboard on content changes. Written in Python using `requests` for SSE connection.

import os
import json
import time
import logging
import requests
import pyperclip


from dotenv import load_dotenv

load_dotenv()


HEARTBEAT_TIMEOUT_SECONDS = 40

logging.basicConfig(
    filename="client.log",
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)


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
                logger.info(f"Connected to SSE endpoint: {base_url}/sse")

                for line in response.iter_lines(decode_unicode=True):
                    if not line:
                        continue

                    if line.startswith("data: "):
                        try:
                            json_str = line[6:]  # Remove 'data: ' prefix
                            data = json.loads(json_str)
                            text = data.get("text", "")

                            # Skip ###ALIVE### messages, only process actual content
                            if text == "###ALIVE###":
                                logger.info("Heartbeat.")
                                continue

                            # Copy content to clipboard
                            logger.info("Received content, updating clipboard...")
                            content_replaced = (
                                text.replace("\n", "<LF>")
                                .replace("\r", "<CR>")
                                .replace("\t", "<TAB>")
                                .replace(" ", "<SPACE>")
                            )
                            pyperclip.copy(text)
                            logger.info(f"Content copied: `{content_replaced}`")

                        except json.JSONDecodeError as e:
                            logger.error(f"Error parsing JSON: {e}")
                            continue

        except requests.exceptions.Timeout:
            logger.warning(
                f"No heartbeat received for {HEARTBEAT_TIMEOUT_SECONDS} seconds. Reconnecting..."
            )
            time.sleep(2)
        except requests.exceptions.ConnectionError as e:
            if "Read timed out" in str(e):
                logger.warning(
                    f"No heartbeat received for {HEARTBEAT_TIMEOUT_SECONDS} seconds. Reconnecting..."
                )
            else:
                logger.warning(f"Connection error: {e}. Reconnecting...")
            time.sleep(2)
        except requests.exceptions.RequestException as e:
            logger.warning(f"Request error: {e}. Reconnecting...")
            time.sleep(2)
        except KeyboardInterrupt:
            logger.info("Stopped by user.")
            break
        except Exception as e:
            logger.exception(f"Unexpected error: {e}. Reconnecting...")
            time.sleep(2)


if __name__ == "__main__":
    load_dotenv()

    base_url = os.getenv("SERVER_BASE_URL")

    if base_url is None:
        logger.error("Error: SERVER_BASE_URL not found in .env file")
    else:
        connect_and_watch_events(base_url)
