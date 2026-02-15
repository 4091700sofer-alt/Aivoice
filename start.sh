#!/bin/bash

echo "=========================================="
echo "Satmar Matzah Bakery - Voice POS System"
echo "=========================================="
echo ""

cleanup() {
    echo ""
    echo "Shutting down services..."
    if [ ! -z "$AGENT_PID" ]; then
        kill $AGENT_PID 2>/dev/null
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "[1/2] Starting Voice Agent (LiveKit Python)..."
cd agent
python main.py dev &
AGENT_PID=$!
cd ..

echo "[2/2] Starting Dashboard (Express + React)..."
echo ""
echo "=========================================="
echo "Services starting up..."
echo "=========================================="
echo ""
echo "  Dashboard:    http://localhost:5000"
echo "  Voice Agent:  Connecting to LiveKit..."
echo ""
echo "  When someone calls your LiveKit number,"
echo "  Chaim will answer and take orders!"
echo ""

NODE_ENV=development tsx server/index.ts
