#!/bin/bash

# Navigate to the project directory
cd "$(dirname "$0")"

# Check if the PID file exists
if [ -f "dashboard.pid" ]; then
  PID=$(cat dashboard.pid)
  
  # Check if the process is running
  if ps -p $PID > /dev/null; then
    echo "Stopping Instagram automation dashboard with PID $PID..."
    
    # Send termination signal to the process
    kill $PID
    
    # Wait for the process to terminate
    for i in {1..10}; do
      if ! ps -p $PID > /dev/null; then
        break
      fi
      echo "Waiting for dashboard to terminate..."
      sleep 1
    done
    
    # Force kill if still running
    if ps -p $PID > /dev/null; then
      echo "Dashboard didn't terminate gracefully. Force killing..."
      kill -9 $PID
    fi
    
    echo "Instagram automation dashboard stopped."
  else
    echo "No running dashboard found with PID $PID."
  fi
  
  # Remove the PID file
  rm dashboard.pid
else
  echo "No dashboard PID file found. The dashboard may not be running."
fi 