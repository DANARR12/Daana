#!/usr/bin/env bash

# Linux Keep Awake Script using xdotool
# Prevents system sleep by moving mouse cursor

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_info() {
    echo -e "${BLUE}📱${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

# Check if xdotool is installed
check_dependencies() {
    if ! command -v xdotool &> /dev/null; then
        print_error "xdotool is not installed"
        print_info "Install it with:"
        echo "  Ubuntu/Debian: sudo apt install xdotool"
        echo "  Fedora/RHEL:   sudo dnf install xdotool"
        echo "  Arch:          sudo pacman -S xdotool"
        exit 1
    fi
}

# Graceful exit handler
cleanup() {
    echo ""
    print_status "Keep Awake script stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Startup message
print_info "Linux Keep Awake script started"
print_info "Mouse will nudge every 1.5-3 minutes"
print_info "Movement: 2 pixels right, then back to original position"
print_warning "Press Ctrl+C to stop"
echo ""

# Check dependencies
check_dependencies

# Main loop
nudge_count=0
while true; do
    # Move mouse 2 pixels right
    xdotool mousemove_relative -- 2 0
    sleep 0.2
    # Move mouse 2 pixels left (back to original position)
    xdotool mousemove_relative -- -2 0
    
    # Increment counter
    ((nudge_count++))
    
    # Random sleep between 90-180 seconds (1.5-3 minutes)
    sleep_time=$((90 + RANDOM % 90))
    minutes=$((sleep_time / 60))
    seconds=$((sleep_time % 60))
    
    print_status "Nudge #${nudge_count} completed - next nudge in ${minutes}m ${seconds}s"
    
    # Sleep for the calculated time
    sleep $sleep_time
done