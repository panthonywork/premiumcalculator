#!/bin/bash
# TD FlexLine Protection Plan Calculator — Launch Script

# Ensure Homebrew's node/npm are on the PATH
export PATH="/opt/homebrew/bin:$PATH"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  TD FlexLine Protection Plan Calculator"
echo "  Starting dev server..."
echo ""

cd "$PROJECT_DIR"

# Start the dev server in the background
npm run dev &
SERVER_PID=$!

# Wait for the server to be ready (polls port 5173)
echo "  Waiting for server to be ready..."
for i in {1..20}; do
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

echo "  Server is running at http://localhost:5173"
echo ""
echo "  Opening in browser..."
open http://localhost:5173

echo ""
echo "  Press Ctrl+C to stop the server."
echo ""

# Wait for the server process — keeps script alive until Ctrl+C
wait $SERVER_PID
