import time
import pyperclip
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Convert the FILE_PATH to an absolute path if it's not already
FILE_PATH = os.path.abspath(os.getenv("STORE_FILE", ""))
LINE_ENDING = os.getenv("LINE_ENDING", "\n")

class FileChangeHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path == FILE_PATH:
            with open(event.src_path, 'r', encoding='utf-8') as file:
                content = file.read()
                
                # Normalize line endings to Unix style
                content = content.replace('\r\n', '\n').replace('\r', '\n').replace('\n', LINE_ENDING)
                
                pyperclip.copy(content)
                print("Clipboard updated with new content.")

def watch_file(file_path):
    event_handler = FileChangeHandler()
    observer = Observer()
    directory = os.path.dirname(file_path)
    
    if os.path.isdir(directory):
        observer.schedule(event_handler, path=directory, recursive=False)
        observer.start()
        try:
            while True:
                time.sleep(300)
        except KeyboardInterrupt:
            observer.stop()
        observer.join()
    else:
        print(f"The directory for the file {file_path} does not exist. Please check the path.")

if __name__ == "__main__":
    if FILE_PATH:
        if os.path.exists(FILE_PATH):
            watch_file(FILE_PATH)
        else:
            print(f"The file at {FILE_PATH} does not exist. Please check the path.")
    else:
        print("Please set the STORE_FILE variable in your .env file.")