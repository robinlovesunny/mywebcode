#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3000

echo "正在停止端口 $PORT 上的进程..."
PID=$(lsof -ti tcp:$PORT)
if [ -n "$PID" ]; then
  kill -9 $PID
  echo "已停止进程 PID: $PID"
else
  echo "端口 $PORT 上没有运行中的进程"
fi

echo "正在启动项目..."
cd "$PROJECT_DIR"
npm run dev
