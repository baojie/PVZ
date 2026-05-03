#!/bin/bash
PID_FILE=/tmp/pvz-server.pid
LOG_FILE=/tmp/pvz-server.log

case "$1" in
    stop)
        if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
            kill "$(cat "$PID_FILE")"
            rm -f "$PID_FILE"
            echo "Stopped"
        else
            rm -f "$PID_FILE" 2>/dev/null
            echo "Not running"
        fi
        exit 0 ;;
    status)
        if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
            echo "Running (PID $(cat "$PID_FILE"))"
        else
            echo "Not running"
        fi
        exit 0 ;;
    -d|--daemon)
        DAEMON=1
        shift ;;
esac

PORT=${1:-1644}

if [ "$DAEMON" = 1 ]; then
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "Already running (PID $(cat "$PID_FILE")). Use '$0 stop' first."
        exit 1
    fi
    nohup python3 -m http.server "$PORT" >"$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 0.3
    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "PVZ daemon at http://localhost:$PORT (PID $(cat "$PID_FILE"), log: $LOG_FILE)"
    else
        echo "Failed to start; check $LOG_FILE"
        rm -f "$PID_FILE"
        exit 1
    fi
else
    echo "Starting PVZ at http://localhost:$PORT"
    exec python3 -m http.server "$PORT"
fi
