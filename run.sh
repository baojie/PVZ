#!/bin/bash
# PVZ 开发服务器。默认动作是 start。
#
#   ./run.sh                 前台启动（默认端口 1644）
#   ./run.sh 3000            前台启动，自定义端口
#   ./run.sh -d              后台启动
#   ./run.sh restart         重启后台服务（先停再起，端口沿用上次）
#   ./run.sh restart 3000    重启并换端口
#   ./run.sh stop            停止后台服务
#   ./run.sh status          查看状态

PID_FILE=/tmp/pvz-server.pid
PORT_FILE=/tmp/pvz-server.port
LOG_FILE=/tmp/pvz-server.log

# 开发服务器：强制 no-store。python3 -m http.server 默认不发缓存头，浏览器会
# 自作主张缓存 ES 模块，改完代码刷新还是旧版本（新植物 / Boss 都看不见）。
SERVE_PY='
import sys, http.server
class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()
http.server.test(HandlerClass=NoCache, port=int(sys.argv[1]), bind="0.0.0.0")
'

running() {
    [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

do_stop() {
    if running; then
        kill "$(cat "$PID_FILE")"
        rm -f "$PID_FILE"
        # 等端口真正释放，否则紧接着的 start 会撞 address already in use
        for _ in $(seq 20); do
            running || break
            sleep 0.1
        done
        sleep 0.4
        return 0
    fi
    rm -f "$PID_FILE" 2>/dev/null
    return 1
}

start_daemon() {
    local port="$1"
    nohup python3 -c "$SERVE_PY" "$port" >"$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "$port" > "$PORT_FILE"
    sleep 0.4
    if running; then
        echo "PVZ daemon at http://localhost:$port (PID $(cat "$PID_FILE"), log: $LOG_FILE)"
    else
        echo "Failed to start; check $LOG_FILE"
        rm -f "$PID_FILE"
        exit 1
    fi
}

ACTION=start
DAEMON=0

# 动作词和选项都可以随便排，端口是唯一的裸数字参数
while [ $# -gt 0 ]; do
    case "$1" in
        start|restart|stop|status) ACTION="$1" ;;
        -d|--daemon)              DAEMON=1 ;;
        [0-9]*)                   PORT="$1" ;;
        -h|--help)
            # 打印开头的注释块（第 2 行起，到第一行非注释为止）
            awk 'NR>1 && /^#/ { sub(/^# ?/, ""); print; next } NR>1 { exit }' "$0"
            exit 0 ;;
        *)
            echo "未知参数：$1（用 -h 看用法）"
            exit 1 ;;
    esac
    shift
done

case "$ACTION" in
    stop)
        if do_stop; then echo "Stopped"; else echo "Not running"; fi
        exit 0 ;;
    status)
        if running; then
            echo "Running (PID $(cat "$PID_FILE"), port $(cat "$PORT_FILE" 2>/dev/null || echo '?'))"
        else
            echo "Not running"
        fi
        exit 0 ;;
    restart)
        # 没指定端口就沿用上次那个
        PORT=${PORT:-$(cat "$PORT_FILE" 2>/dev/null)}
        PORT=${PORT:-1644}
        if do_stop; then echo "Stopped old server"; else echo "Not running, starting fresh"; fi
        start_daemon "$PORT"
        exit 0 ;;
esac

PORT=${PORT:-1644}

if [ "$DAEMON" = 1 ]; then
    if running; then
        echo "Already running (PID $(cat "$PID_FILE")). 用 './run.sh restart' 重启，或 './run.sh stop' 停止。"
        exit 1
    fi
    start_daemon "$PORT"
else
    echo "Starting PVZ at http://localhost:$PORT  (Ctrl+C 停止)"
    echo "$PORT" > "$PORT_FILE"
    exec python3 -c "$SERVE_PY" "$PORT"
fi
