#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/../.zscripts" && pwd)"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT

PROJECT_DIR="$TEST_ROOT/project"
BUILD_DIR="$TEST_ROOT/build"
mkdir -p "$PROJECT_DIR/db" "$BUILD_DIR"
printf 'source SQLite must remain outside the artifact\n' >"$PROJECT_DIR/db/custom.db"

# Build-time secrets are optional and source SQLite is never copied.
PROJECT_DIR="$PROJECT_DIR" BUILD_DIR="$BUILD_DIR" DATABASE_URL="" \
    bash "$SCRIPT_DIR/database-runtime-build.sh"
test ! -e "$BUILD_DIR/db/custom.db"

# A PostgreSQL runtime URL is accepted without being printed or contacted.
PROJECT_DIR="$PROJECT_DIR" BUILD_DIR="$BUILD_DIR" \
    DATABASE_URL="postgresql://runtime:secret@example.invalid:6543/postgres" \
    bash "$SCRIPT_DIR/database-runtime-build.sh"

# SQLite URLs are rejected.
if PROJECT_DIR="$PROJECT_DIR" BUILD_DIR="$BUILD_DIR" \
    DATABASE_URL="file:$PROJECT_DIR/db/custom.db" \
    bash "$SCRIPT_DIR/database-runtime-build.sh"; then
    echo "SQLite DATABASE_URL was unexpectedly accepted" >&2
    exit 1
fi

# A SQLite artifact is rejected even with a valid PostgreSQL URL.
mkdir -p "$BUILD_DIR/db"
printf 'forbidden\n' >"$BUILD_DIR/db/custom.db"
if PROJECT_DIR="$PROJECT_DIR" BUILD_DIR="$BUILD_DIR" \
    DATABASE_URL="postgresql://runtime:secret@example.invalid:6543/postgres" \
    bash "$SCRIPT_DIR/database-runtime-build.sh"; then
    echo "Packaged SQLite was unexpectedly accepted" >&2
    exit 1
fi

echo "database runtime build tests passed"
