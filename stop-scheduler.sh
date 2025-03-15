#!/bin/bash

# Navigate to the project directory
cd "$(dirname "$0")"

# Check if the PID file exists
if [ -f "scheduler.pid" ]; then
    PID=$(cat scheduler.pid)
    
    # Check if the process is running
    if ps -p $PID > /dev/null; then
        echo "Stopping Instagram automation scheduler with PID $PID..."
        
        # Send termination signal to the process
        kill $PID
        
        # Wait for the process to terminate
        for i in {1..10}; do
            if ! ps -p $PID > /dev/null; then
                break
            fi
            echo "Waiting for scheduler to terminate..."
            sleep 1
        done
        
        # Force kill if still running
        if ps -p $PID > /dev/null; then
            echo "Scheduler didn't terminate gracefully. Force killing..."
            kill -9 $PID
        fi
        
        echo "Instagram automation scheduler stopped."
    else
        echo "No running scheduler found with PID $PID."
    fi
    
    # Remove the PID file
    rm scheduler.pid
else
    echo "No scheduler PID file found. The scheduler may not be running."
fi 