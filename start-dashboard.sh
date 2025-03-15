#!/bin/bash

# Navigate to the project directory
cd "$(dirname "$0")"

# Check if PORT environment variable is set, otherwise use default
PORT=${PORT:-3000}

# Build the Next.js dashboard (optional - remove for development)
echo "Building the dashboard..."
npm run build

echo "Starting the Instagram automation dashboard on port $PORT..."

# Start the dashboard in production mode with consolidated logging
NODE_ENV=production PORT=$PORT nohup npm run start > dashboard.log 2>&1 &

# Save the process ID
echo $! > dashboard.pid

echo "Instagram automation dashboard started with PID $(cat dashboard.pid)"
echo "Dashboard is running at http://localhost:$PORT"
echo "Logs are being written to dashboard.log" 