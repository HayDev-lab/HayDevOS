#!/bin/bash

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/z/my-project}"
BUILD_DIR="${BUILD_DIR:?BUILD_DIR is required}"

case "${DATABASE_URL:-}" in
    "")
        echo "INFO: DATABASE_URL is injected at runtime; no database is packaged."
        ;;
    postgres://*|postgresql://*)
        echo "PASS: external PostgreSQL DATABASE_URL detected."
        ;;
    *)
        echo "ERROR: DATABASE_URL must use PostgreSQL; packaged SQLite is forbidden." >&2
        exit 1
        ;;
esac

if [ -e "$BUILD_DIR/db/custom.db" ] || [ -e "$BUILD_DIR/db/haydev.db" ]; then
    echo "ERROR: refusing to package a SQLite database in the production artifact." >&2
    exit 1
fi

echo "PASS: database packaging guard passed; run db:deploy before cutover."
