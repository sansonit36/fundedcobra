import subprocess
import os
import json

SLOT_PATH = r"C:\FundedCobra\Terminals\Slot_01"
ACCOUNT_FILE = os.path.join(os.environ['USERPROFILE'], 'Desktop', 'accounts.txt')
ORDER_FILE = os.path.join(os.environ['USERPROFILE'], 'Desktop', 'orders.txt')
SETTINGS_FILE = os.path.join(os.environ['USERPROFILE'], 'Desktop', 'global_settings.json')

def run_test():
    if not all(os.path.exists(f) for f in [ACCOUNT_FILE, ORDER_FILE, SETTINGS_FILE]):
        return

    with open(ACCOUNT_FILE, 'r') as f:
        login, password, server = f.readline().strip().split(',')

    with open(ORDER_FILE, 'r') as f:
        customer_email = f.readline().strip()

    with open(SETTINGS_FILE, 'r') as f:
        settings = json.load(f)

    config_content = f"""[Common]
Login={login}
Password={password}
Server={server}
EmailEnable=1
EmailSMTP={settings['smtp_host']}
EmailLogin={settings['smtp_login']}
EmailPassword={settings['smtp_pass']}
EmailFrom={settings['smtp_from']}
EmailTo={customer_email}

[Experts]
Enabled=1
AllowLiveTrading=1
AllowDllImport=1
WebRequest=1
WebRequestUrl={settings['allowed_urls']}
"""
    config_path = os.path.join(SLOT_PATH, "final_test.ini")
    with open(config_path, 'w', encoding='utf-16') as f:
        f.write(config_content)

    terminal_exe = os.path.join(SLOT_PATH, "terminal64.exe")
    subprocess.Popen([terminal_exe, "/portable", f"/config:final_test.ini"], cwd=SLOT_PATH)

if __name__ == "__main__":
    run_test()
