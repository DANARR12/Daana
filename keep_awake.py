# keep_awake.py
import time, random, pyautogui

# failsafe off so corners won't stop the script
pyautogui.FAILSAFE = False

def nudge():
    x, y = pyautogui.position()
    dx = random.randint(1, 3) * random.choice([1, -1])
    dy = random.randint(1, 3) * random.choice([1, -1])
    pyautogui.moveRel(dx, dy, duration=0.2)
    pyautogui.moveTo(x, y, duration=0.2)  # put it back

if __name__ == "__main__":
    print("🎯 Keep Awake script started - preventing system sleep...")
    print("📱 Mouse will nudge every 1.5-3 minutes")
    print("⏹️  Press Ctrl+C to stop")
    
    try:
        while True:
            nudge()
            sleep_time = random.randint(90, 180)  # every 1.5–3 minutes
            print(f"✅ Mouse nudged - next nudge in {sleep_time//60}m {sleep_time%60}s")
            time.sleep(sleep_time)
    except KeyboardInterrupt:
        print("\n🛑 Keep Awake script stopped")