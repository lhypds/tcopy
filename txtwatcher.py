import time
import pyperclip
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from dotenv import load_dotenv
import os
import logging

# Load environment variables from .env file
load_dotenv()

# Convert the FILE_PATH to an absolute path if it's not already
FILE_PATH = os.path.abspath(os.getenv("STORE_FILE", ""))

# Set up logging
logging.basicConfig(level=logging.INFO)


class FileChangeHandler(FileSystemEventHandler):
    last_modified = 0
    file_inaccessible = False

    def on_modified(self, event):
        if event.src_path == FILE_PATH:
            current_time = time.time()
            if current_time - self.last_modified < 3:  # 3 seconds debounce
                return
            self.last_modified = current_time

            # Wait for the file to be written to
            time.sleep(1)

            # Check if the file exists before opening
            if os.path.exists(event.src_path):
                if self.file_inaccessible:
                    logging.info(f"File {event.src_path} is now accessible.")
                    self.file_inaccessible = False
                    return

                try:
                    with open(event.src_path, "r", encoding="utf-8") as file:
                        content = file.read()

                        pyperclip.copy(content)
                        timeString = time.strftime(
                            "%Y-%m-%d %H:%M:%S", time.localtime()
                        )
                        logging.info(f"{timeString} - update received, content:")
                        print(content)
                except FileNotFoundError:
                    logging.error(
                        f"File {event.src_path} not found. It might have been moved or deleted."
                    )
            else:
                logging.error(f"File {event.src_path} does not exist at the moment.")
                self.file_inaccessible = True


def watch_file(file_path):
    directory = os.path.dirname(file_path)

    while True:
        # Check if the directory exists
        if os.path.isdir(directory):
            event_handler = FileChangeHandler()
            observer = Observer()
            observer.schedule(event_handler, path=directory, recursive=False)
            observer.start()
            logging.info(f"Start watching file `{file_path}` for changes...")
            try:
                # Loop to keep the script running
                while os.path.exists(file_path):
                    time.sleep(1)  # Sleep for a short period to prevent busy waiting
            except KeyboardInterrupt:
                observer.stop()
                break

            observer.stop()
            observer.join()
            logging.info(
                f"Stopped watching file `{file_path}` because it no longer exists."
            )

            # Wait for the file or directory to become accessible again
            while not os.path.exists(file_path):
                time.sleep(1)  # Check every second

            logging.info(
                f"File `{file_path}` is now accessible again. Restarting watcher..."
            )
        else:
            logging.error(
                f"The directory for the file {file_path} does not exist. Please check the path."
            )
            break  # Exit the loop if the directory itself doesn't exist


if __name__ == "__main__":
    if FILE_PATH:
        if os.path.exists(FILE_PATH):
            watch_file(FILE_PATH)
        else:
            logging.error(
                f"The file at {FILE_PATH} does not exist. Please check the path."
            )
    else:
        logging.error("Please set the STORE_FILE variable in your .env file.")
