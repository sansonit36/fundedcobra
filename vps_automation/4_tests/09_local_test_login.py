import subprocess
import os

SLOT_PATH = r"C:\FundedCobra\Terminals\Slot_01"
ACCOUNT_FILE = os.path.join(os.environ['USERPROFILE'], 'Desktop', 'accounts.txt')

def run_test():
    if not os.path.exists(ACCOUNT_FILE):
        print("Error: accounts.txt not found on Desktop!")
        return
    with open(ACCOUNT_FILE, 'r') as f:
        login, password, server = f.readline().strip().split(',')
    config_content = f"[Common]\nLogin={login}\nPassword={password}\nServer={server}\nProxyEnable=0\n"
    config_path = os.path.join(SLOT_PATH, "auto_start.ini")
    with open(config_path, 'w', encoding='utf-16') as f:
        f.write(config_content)
    subprocess.Popen([os.path.join(SLOT_PATH, "terminal64.exe"), "/portable", f"/config:auto_start.ini"], cwd=SLOT_PATH)
    print("Success: Slot_01 launched.")

if __name__ == "__main__":
    run_test()
