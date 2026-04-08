#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

mode=""
environment=""
command="${1:-}"

printUsage() {
	echo "Usage: tcopy [install|uninstall|update|setup|start|stop|restart|status|-v|--version|-h|--help]"
}

if [[ "${1:-}" == "-v" || "${1:-}" == "--version" ]]; then
	echo "$(cat "$SCRIPT_DIR/VERSION")"
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
	local mode_option="${1:-}"

	if [[ "$mode_option" == "reset" ]]; then
		mode=""
		environment=""
	else
		mode="$(_read_env_value "MODE" "$ENV_FILE")"
		environment="$(_read_env_value "ENVIRONMENT" "$ENV_FILE")"
	fi

	if [[ "$mode_option" == "nochoose" ]]; then
		if [[ "$mode" == "file" ]]; then
			environment="file"
		fi
		return 0
	fi

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
    echo "Current envrionment: $environment"
  fi
}

printUsage() {
	echo "Usage: tcopy [install|uninstall|update|setup|start|stop|restart|info|-v|--version|-h|--help]"
}

case "$command" in
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
		readEnv "reset"
		runRootScript "setup" "$(resolveTargetDir)"
		;;
	info)
		readEnv "nochoose"
		showInfo
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
  "")
    printUsage
    ;;
	*)
		echo "Error: unknown command '$command'"
		printUsage
		exit 1
		;;
esac

