#Persistent
#NoTrayIcon ; Remove this line if you want the tray icon
#SingleInstance Force ; Only allow one instance

; Set timer to jiggle mouse every 2 minutes (120000 ms)
SetTimer, Jiggle, 120000

; Show startup message
TrayTip, Keep Awake Script, Mouse will jiggle every 2 minutes to prevent sleep, 5, 1

Jiggle:
  ; Move mouse 2 pixels right
  DllCall("mouse_event", "UInt", 0x0001, "Int", 2, "Int", 0, "UInt", 0, "Int", 0)
  Sleep, 200
  ; Move mouse 2 pixels left (back to original position)
  DllCall("mouse_event", "UInt", 0x0001, "Int", -2, "Int", 0, "UInt", 0, "Int", 0)
  
  ; Optional: Show notification (comment out if you don't want notifications)
  ; TrayTip, Keep Awake, Mouse jiggled - next jiggle in 2 minutes, 2, 1
return

; Hotkey to exit script (Ctrl+Alt+Q)
^!q::
  TrayTip, Keep Awake Script, Script stopped, 2, 1
  Sleep, 1000
  ExitApp
return

; Right-click tray menu
Menu, Tray, Add, Exit, ExitScript
Menu, Tray, Default, Exit

ExitScript:
  TrayTip, Keep Awake Script, Script stopped, 2, 1
  Sleep, 1000
  ExitApp
return