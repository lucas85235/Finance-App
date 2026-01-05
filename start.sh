#!/bin/bash

echo ""
echo "========================================"
echo "  💰 Finance Dashboard"
echo "========================================"
echo ""
echo "Iniciando servidor em http://localhost:8080"
echo "Pressione Ctrl+C para encerrar"
echo ""

# Function to open browser
open_browser() {
    sleep 2
    if which xdg-open > /dev/null; then
        xdg-open http://localhost:8080
    elif which open > /dev/null; then
        open http://localhost:8080
    else
        echo "Could not detect web browser to open."
    fi
}

# Open browser in background
open_browser &

# Start Python server
python3 -m http.server 8080
