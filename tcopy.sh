#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

mode=""
environment=""
server_base_url=""
command="${1:-}"

_read_env_value() {
	local key="$1"
	local file="$2"

	if [ ! -f "$file" ]; then
		return 0
	fi

	grep -E "^[[:space:]]*${key}=" "$file" | tail -n 1 | cut -d '=' -f2- | sed 's/^"//; s/"$//' | sed "s/^'//; s/'$//"
}

_choose_mode() {
	while true; do
		printf "Choose MODE ([s]erver/s[t]orage): "
		read -r answer
		case "${answer}" in
			s|S|server|SERVER)
				mode="server"
				break
				;;
			t|T|storage|STORAGE)
				mode="storage"
				break
				;;
			*)
				echo "Invalid MODE. Please choose 'server' or 'storage'."
				;;
		esac
	done
}

writeEnv() {
	local tmp_file

	if [ ! -f "$ENV_FILE" ]; then
		if [ -f "$SCRIPT_DIR/.env.example" ]; then
			cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
		else
			touch "$ENV_FILE"
		fi
	fi

	tmp_file="${ENV_FILE}.tmp"

	awk -v k="MODE" -v v="$mode" '
		BEGIN { updated = 0 }
		$0 ~ "^[[:space:]]*" k "=" {
			if (!updated) {
				print k "=" v
				updated = 1
			}
			next
		}
		{ print }
		END {
			if (!updated) {
				print k "=" v
			}
		}
	' "$ENV_FILE" > "$tmp_file" && mv "$tmp_file" "$ENV_FILE"
}

resetEnv() {
	mode=""
	environment=""
	server_base_url=""

	local tmp_file
	local server_env_file="$SCRIPT_DIR/server_mode/.env"

	# Reset MODE in .env
	if [ ! -f "$ENV_FILE" ]; then
		if [ -f "$SCRIPT_DIR/.env.example" ]; then
			cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
		else
			touch "$ENV_FILE"
		fi
	fi

	tmp_file="${ENV_FILE}.tmp"
	awk -v k="MODE" -v v="" '
		BEGIN { updated = 0 }
		$0 ~ "^[[:space:]]*" k "=" {
			if (!updated) {
				print k "=" v
				updated = 1
			}
			next
		}
		{ print }
		END {
			if (!updated) {
				print k "=" v
			}
		}
	' "$ENV_FILE" > "$tmp_file" && mv "$tmp_file" "$ENV_FILE"

	# Reset ENVIRONMENT in server_mode/.env
	if [ ! -f "$server_env_file" ]; then
		if [ -f "$SCRIPT_DIR/server_mode/.env.example" ]; then
			cp "$SCRIPT_DIR/server_mode/.env.example" "$server_env_file"
		else
			touch "$server_env_file"
		fi
	fi

	tmp_file="${server_env_file}.tmp"
	awk -v k="ENVIRONMENT" -v v="" '
		BEGIN { updated = 0 }
		$0 ~ "^[[:space:]]*" k "=" {
			if (!updated) {
				print k "=" v
				updated = 1
			}
			next
		}
		{ print }
		END {
			if (!updated) {
				print k "=" v
			}
		}
	' "$server_env_file" > "$tmp_file" && mv "$tmp_file" "$server_env_file"
}

readEnv() {
	mode="$(_read_env_value "MODE" "$ENV_FILE")"
	if [[ "$mode" == "server" ]]; then
		environment="$(_read_env_value "ENVIRONMENT" "$SCRIPT_DIR/server_mode/.env")"
		if [[ "$environment" == "client" ]]; then
			server_base_url="$(_read_env_value "SERVER_BASE_URL" "$SCRIPT_DIR/server_mode/.env")"
		else
			server_base_url=""
		fi
	elif [[ "$mode" == "storage" ]]; then
		environment=""
		server_base_url=""
	fi

	if [[ "$mode" != "storage" && "$mode" != "server" ]]; then
		_choose_mode
	fi

	writeEnv
}

resolveTargetDir() {
	local target_dir=""

	if [[ "$mode" == "storage" ]]; then
		target_dir="$SCRIPT_DIR/storage_mode"
	elif [[ "$mode" == "server" ]]; then
		target_dir="$SCRIPT_DIR/server_mode"
	fi

	echo "$target_dir"
}

runCommandScript() {
	local script_name="$1"
	shift || true
	local target_dir
	target_dir="$(resolveTargetDir)"

	if [ ! -f "$target_dir/${script_name}.sh" ]; then
		echo "Error: ${script_name}.sh not found in $target_dir"
		exit 1
	fi

	(
		cd "$target_dir"
		bash "./${script_name}.sh" "$@"
	)
}

runRootScript() {
	local script_name="$1"
	local script_path="$SCRIPT_DIR/${script_name}.sh"
	shift

	if [ ! -f "$script_path" ]; then
		echo "Error: ${script_name}.sh not found in $SCRIPT_DIR"
		exit 1
	fi

	bash "$script_path" "$@"
}

runUpdate() {
	(
		cd "$SCRIPT_DIR"
		git pull
	)
}

showInfo() {
    echo "tcopy $(cat "$SCRIPT_DIR/VERSION")"
    echo "Current mode: $mode"
	
    if [[ "$mode" == "server" ]]; then
	    echo "Current environment: $environment"
	if [[ "$environment" == "client" && -n "$server_base_url" ]]; then
		echo "Server base URL: $server_base_url"
	fi
  fi
}

printUsage() {
	echo "Usage: tcopy [copy|paste|install|uninstall|update|setup|start|stop|restart|info|-v|--version|-h|--help|<text>]"
}

case "$command" in
	copy|"")
		readEnv
		runCommandScript "copy" "${@:2}"
		;;
	paste)
		readEnv
		runCommandScript "paste" "${@:2}"
		;;
	install)
		runRootScript "install"
		;;
	uninstall)
		runRootScript "uninstall"
		;;
	update)
		runUpdate
		;;
	setup)
		resetEnv
		readEnv
		runCommandScript "setup"
		;;
	start)
	    # For server mode, it will start the server or client process
		# Or for storage, it will start the file watcher process
		readEnv
		runCommandScript "start"
		;;
	stop)
		readEnv
		runCommandScript "stop"
		;;
	restart)
		readEnv
		runCommandScript "restart"
		;;
	info)
		readEnv "nochoose"
		showInfo
		;;
	-v|--version)
		echo "$(cat "$SCRIPT_DIR/VERSION")"
		;;
	-h|--help)
		printUsage
		;;
	*)
		readEnv
		runCommandScript "copy" "$@"
		;;
esac

