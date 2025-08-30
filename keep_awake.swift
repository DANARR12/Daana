// Save as keep_awake.swift, run with: swift keep_awake.swift
// macOS Keep Awake Script - Prevents system sleep by moving mouse cursor
import Foundation
import CoreGraphics

func nudge() {
    // Get current mouse position
    let loc = CGEvent(source: nil)!.location
    
    // Create mouse movement events
    let move1 = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: CGPoint(x: loc.x+2, y: loc.y), mouseButton: .left)
    let move2 = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: loc, mouseButton: .left)
    
    // Post the first movement (2 pixels right)
    move1?.post(tap: .cghidEventTap)
    
    // Wait 200ms
    usleep(200_000)
    
    // Post the second movement (back to original position)
    move2?.post(tap: .cghidEventTap)
}

func printStartupMessage() {
    print("🎯 macOS Keep Awake script started")
    print("📱 Mouse will nudge every 1.5-3 minutes")
    print("⏹️  Press Ctrl+C to stop")
    print("🖱️  Movement: 2 pixels right, then back to original position")
    print("")
}

// Signal handler for graceful exit
signal(SIGINT) { _ in
    print("\n🛑 Keep Awake script stopped")
    exit(0)
}

// Main execution
printStartupMessage()

var nudgeCount = 0
while true {
    nudge()
    nudgeCount += 1
    
    let sleepTime = Int.random(in: 90...180) // 1.5-3 minutes
    let minutes = sleepTime / 60
    let seconds = sleepTime % 60
    
    print("✅ Nudge #\(nudgeCount) completed - next nudge in \(minutes)m \(seconds)s")
    
    sleep(UInt32(sleepTime))
}