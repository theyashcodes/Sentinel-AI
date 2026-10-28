#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

if [ ! -d "venv" ]; then
    echo "Creating virtualenv..."
    /Users/macbookm1/.local/bin/python3.11 -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
fi

echo "🚀 Starting Sentinel AI Zero-Metadata Pixel Forensics Microservice on http://127.0.0.1:8000..."
exec ./venv/bin/python3 service.py
