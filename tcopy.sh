#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

mode=""
environment=""
command="${1:-}"

printUsage() {
	echo "Usage: ./tcopy.sh [setup|start|stop|restart|status|-v|--version|-h|--help]"
}

if [[ "${1:-}" == "-v" || "${1:-}" == "--version" ]]; then
	echo "tcopy $(cat "$SCRIPT_DIR/VERSION")"
	exit 0
fi

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
	printUsage
	exit 0
fi

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
		printf "Choose MODE ([s]erver/[f]ile): "
		read -r answer
		case "${answer}" in
			s|S|server|SERVER)
				mode="server"
				break
				;;
			f|F|file|FILE)
				mode="file"
				break
				;;
			*)
				echo "Invalid MODE. Please choose 'server' or 'file'."
				;;
		esac
	done
}

_choose_environment_for_server() {
	while true; do
		printf "Choose ENVIRONMENT for server mode ([s]erver/[c]lient): "
		read -r answer
		case "${answer}" in
			s|S|server|SERVER)
				environment="server"
				break
				;;
			c|C|client|CLIENT)
				environment="client"
				break
				;;
			*)
				echo "Invalid ENVIRONMENT. Please choose 'server' or 'client'."
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

	awk -v k="ENVIRONMENT" -v v="$environment" '
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

readEnv() {
	mode="$(_read_env_value "MODE" "$ENV_FILE")"
	environment="$(_read_env_value "ENVIRONMENT" "$ENV_FILE")"

	if [[ "$mode" != "file" && "$mode" != "server" ]]; then
		_choose_mode
	fi

	if [[ "$mode" == "file" ]]; then
		environment="file"
	else
		if [[ "$environment" != "server" && "$environment" != "client" ]]; then
			_choose_environment_for_server
		fi
	fi

	writeEnv
}

resolveTargetDir() {
	local target_dir=""

	if [[ "$mode" == "file" ]]; then
		target_dir="$SCRIPT_DIR/file_mode"
	elif [[ "$mode" == "server" ]]; then
		if [[ "$environment" == "server" ]]; then
			target_dir="$SCRIPT_DIR/server_mode/server"
		else
			target_dir="$SCRIPT_DIR/server_mode/client"
		fi
	fi

	if [ -z "$target_dir" ] || [ ! -d "$target_dir" ]; then
		echo "Error: target directory not found for MODE=$mode ENVIRONMENT=$environment"
		exit 1
	fi

	echo "$target_dir"
}

runSetup() {
	local target_dir
	target_dir="$(resolveTargetDir)"

	if [ ! -f "$target_dir/setup.sh" ]; then
		echo "Error: setup.sh not found in $target_dir"
		exit 1
	fi

	(
		cd "$target_dir"
		bash ./setup.sh
	)

	echo "Setup complete"
}

runCommandScript() {
	local script_name="$1"
	local target_dir
	target_dir="$(resolveTargetDir)"

	if [ ! -f "$target_dir/${script_name}.sh" ]; then
		echo "Error: ${script_name}.sh not found in $target_dir"
		exit 1
	fi

	(
		cd "$target_dir"
		bash "./${script_name}.sh"
	)
}

showStatus() {
	echo "tcopy $(cat "$SCRIPT_DIR/VERSION")"
  printUsage
	echo "\`$mode\` mode."
	if [[ "$mode" == "server" ]]; then
		echo "\`$environment\` environment."
	fi
}

printUsage() {
	echo "Usage: ./tcopy.sh [setup|start|stop|restart|status|-v|--version|-h|--help]"
}

case "$command" in
	setup)
		readEnv
		runSetup
		;;
	status|"")
		readEnv
		showStatus
		;;
	start)
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
	*)
		echo "Error: unknown command '$command'"
		printUsage
		exit 1
		;;
esac

