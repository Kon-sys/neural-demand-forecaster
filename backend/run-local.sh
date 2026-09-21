#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/database/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: database/.env not found."
    echo
    echo "Create it from database/.env.example:"
    echo "cp database/.env.example database/.env"
    exit 1
fi

if [[ ! -x "$SCRIPT_DIR/mvnw" ]]; then
    echo "ERROR: Maven Wrapper is not executable."
    echo
    echo "Run:"
    echo "chmod +x backend/mvnw"
    exit 1
fi

JAVA_MAJOR_VERSION="$(java -version 2>&1 | head -n 1 | sed -E 's/.*"([0-9]+).*/\1/')"

if [[ "$JAVA_MAJOR_VERSION" != "21" ]]; then
    echo "ERROR: Java 21 is required."
    echo "Current Java version:"
    java -version
    exit 1
fi

set -a
source "$ENV_FILE"
set +a

cd "$SCRIPT_DIR"

exec ./mvnw spring-boot:run