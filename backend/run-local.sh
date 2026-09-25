#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DATABASE_ENV="$PROJECT_ROOT/database/.env"
BACKEND_ENV="$SCRIPT_DIR/.env"

if [[ ! -f "$DATABASE_ENV" ]]; then
    echo "ERROR: database/.env not found."
    echo "Create it:"
    echo "cp database/.env.example database/.env"
    exit 1
fi

if [[ ! -f "$BACKEND_ENV" ]]; then
    echo "ERROR: backend/.env not found."
    echo "Create it:"
    echo "cp backend/.env.example backend/.env"
    exit 1
fi

if [[ ! -x "$SCRIPT_DIR/mvnw" ]]; then
    echo "ERROR: Maven Wrapper is not executable."
    echo "Run:"
    echo "chmod +x backend/mvnw"
    exit 1
fi

# On macOS automatically prefer JDK 21 when it is installed.
if [[ -x "/usr/libexec/java_home" ]]; then
    JAVA_21_HOME="$(
        /usr/libexec/java_home -v 21 2>/dev/null || true
    )"

    if [[ -n "$JAVA_21_HOME" ]]; then
        export JAVA_HOME="$JAVA_21_HOME"
        export PATH="$JAVA_HOME/bin:$PATH"
    fi
fi

JAVA_MAJOR_VERSION="$(
    java -version 2>&1 \
        | head -n 1 \
        | sed -E 's/.*"([0-9]+).*/\1/'
)"

if [[ "$JAVA_MAJOR_VERSION" != "21" ]]; then
    echo "ERROR: Java 21 is required."
    echo
    java -version
    exit 1
fi

set -a
source "$DATABASE_ENV"
source "$BACKEND_ENV"
set +a

cd "$SCRIPT_DIR"

exec ./mvnw spring-boot:run