#!/bin/bash
PORT=${1:-1644}
echo "Starting PVZ at http://localhost:$PORT"
python3 -m http.server "$PORT"
