import pyperclip
import os
import requests
from dotenv import load_dotenv

def write_clipboard_to_file(file_path):
    # Get the current clipboard content
    clipboard_content = pyperclip.paste()

    # Write the clipboard content to the file
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(clipboard_content)
        print(f"Clipboard content written to {file_path}")


def send_clipboard_content_to_server(url):
    # Get the current clipboard content
    clipboard_content = pyperclip.paste()

    # Send the clipboard content using a GET request with a query parameter
    response = requests.get(url, params={'text': clipboard_content})
    
    if response.status_code == 200:
        print(f"Clipboard content sent to {url}")
    else:
        print(f"Failed to send clipboard content. Status code: {response.status_code}")


if __name__ == "__main__":
    # Load environment variables from .env file
    load_dotenv()

    # Get the storage type and relevant paths/URLs from environment variables
    store_type = os.getenv('STORE_TYPE')
    store_file = os.getenv('STORE_FILE')
    store_url = os.getenv('STORE_URL')

    if store_type is None:
        print("Error: STORE_TYPE not found in .env file")
    elif store_type == 'file':
        if store_file is not None:
            write_clipboard_to_file(store_file)
        else:
            print("Error: STORE_FILE not found in .env file")
    elif store_type == 'server':
        if store_url is not None:
            send_clipboard_content_to_server(store_url + "/save")  # endpont is /save
        else:
            print("Error: STORE_URL not found in .env file")
    else:
        print("Error: Invalid STORE_TYPE. Must be 'file' or 'server'.")