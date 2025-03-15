#!/bin/bash

# Navigate to the project directory
cd "$(dirname "$0")"

echo "Starting Instagram automation scheduler..."

# Start the scheduler in the background and redirect output to scheduler.log
nohup ts-node src/scheduler.ts > scheduler.log 2>&1 &

# Save the process ID
echo $! > scheduler.pid

echo "Instagram automation scheduler started with PID $(cat scheduler.pid)"
echo "Logs are being written to scheduler.log" 