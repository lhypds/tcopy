import time
import pyperclip
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Get the file path from the environment variable
FILE_PATH = os.getenv("STORE_FILE")

class FileChangeHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path == FILE_PATH:
            with open(event.src_path, 'r', encoding='utf-8') as file:
                content = file.read()
                pyperclip.copy(content)
                print("Clipboard updated with new content from clipboard.txt")

def watch_file(file_path):
    event_handler = FileChangeHandler()
    observer = Observer()
    observer.schedule(event_handler, path=os.path.dirname(file_path), recursive=False)
    observer.start()
    try:
        while True:
            time.sleep(300)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    if FILE_PATH is not None:
        if os.path.exists(FILE_PATH):
            watch_file(FILE_PATH)
        else:
            print(f"The file at {FILE_PATH} does not exist. Please check the path.")
    else:
        print("Please set the STORE_FILE variable in your .env file.")