import win32gui
import psutil
import time

def rename_terminals():
    for proc in psutil.process_iter(['pid', 'name', 'exe']):
        if proc.info['name'] == 'terminal64.exe':
            try:
                exe_path = proc.info['exe']
                if 'Slot_' in exe_path:
                    slot_name = exe_path.split('\\')[-2]
                    target_title = f"{slot_name} - FundedCobra"
                    def callback(hwnd, extra):
                        if win32gui.GetWindowThreadProcessId(hwnd)[1] == proc.pid:
                            if win32gui.GetWindowText(hwnd) != target_title:
                                win32gui.SetWindowText(hwnd, target_title)
                    win32gui.EnumWindows(callback, None)
            except: continue

if __name__ == "__main__":
    while True:
        rename_terminals()
        time.sleep(0.5)
