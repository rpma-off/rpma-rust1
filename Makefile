# Makefile for RPMA Rust project
.PHONY: help build test test-commands test-commands-specific clean lint format

help:
	@echo "Available commands:"
	@echo "  build                    - Build the project"
	@echo "  test                     - Run all tests"
	@echo "  test-commands           - Run all command tests"
	@echo "  test-auth-commands      - Run auth command tests"
	@echo "  test-client-commands    - Run client command tests"
	@echo "  test-user-commands      - Run user command tests"
	@echo "  test-intervention-cmds  - Run intervention command tests"
	@echo "  test-task-commands      - Run task command tests"
	@echo "  lint                    - Run clippy lints"
	@echo "  format                  - Format the code"
	@echo "  clean                   - Clean build artifacts"

build:
	cd src-tauri && cargo build

test:
	cd src-tauri && cargo test

test-commands:
	cd src-tauri && cargo test --test auth_commands_test --test client_commands_test --test user_commands_test --test intervention_commands_test --test task_commands_test

test-auth-commands:
	cd src-tauri && cargo test --test auth_commands_test

test-client-commands:
	cd src-tauri && cargo test --test client_commands_test

test-user-commands:
	cd src-tauri && cargo test --test user_commands_test

test-intervention-cmds:
	cd src-tauri && cargo test --test intervention_commands_test

test-task-commands:
	cd src-tauri && cargo test --test task_commands_test

lint:
	cd src-tauri && cargo clippy -- -D warnings

format:
	cd src-tauri && cargo fmt

clean:
	cd src-tauri && cargo clean