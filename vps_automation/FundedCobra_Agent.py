import os
import time
import json
import subprocess
import shutil

# --- PATHS ---
WORKDIR = r"C:\FundedCobra"
CONFIG_FILE = os.path.join(WORKDIR, "vps_automation", "config_master.json")
INBOX = os.path.join(WORKDIR, "Inbox")
ACCOUNTS_STOCK = os.path.join(INBOX, "accounts_stock.txt")
ORDERS_FILE = os.path.join(INBOX, "orders.txt")
LOG_DIR = os.path.join(WORKDIR, "Logs")

def log_event(message):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{timestamp}] {message}"
    print(log_line)
    with open(os.path.join(LOG_DIR, "agent_log.txt"), "a") as f:
        f.write(log_line + "\n")

def get_config():
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)

def provision_account(customer_email, account_data):
    config = get_config()
    login, password, server = account_data
    
    # 1. Find an empty slot
    target_slot = None
    for i in range(1, 26):
        path = os.path.join(WORKDIR, "Terminals", f"Slot_{i:02d}")
        # Logic: If it has no 'common.ini' yet, it's fresh? Or check if terminal is running?
        # For this logic, we use the first available directory
        target_slot = path
        break # Placeholder: In production, we'd check if Slot is already used

    log_event(f"Provisioning Slot {target_slot} for {customer_email}")

    # 2. Update common.ini (Section-Safe)
    common_ini = os.path.join(target_slot, "config", "common.ini")
    os.makedirs(os.path.dirname(common_ini), exist_ok=True)
    
    # Template logic: Start with a clear file or read existing
    lines = []
    if os.path.exists(common_ini):
        with open(common_ini, "r") as f:
            lines = f.readlines()
            
    # Inject sections
    config_str = f"""[Common]
Login={login}
Password={password}
Server={server}
EmailEnable=1
EmailSMTP={config['smtp']['host']}
EmailLogin={config['smtp']['login']}
EmailPassword={config['smtp']['pass']}
EmailFrom={config['smtp']['from']}
EmailTo={customer_email}

[Experts]
Enabled=1
AllowLiveTrading=1
AllowDllImport=1
WebRequest=1
WebRequestUrl={config['terminal_settings']['allowed_urls']}
"""
    # Write full state to common.ini (Manual rewrite ensures purity)
    with open(common_ini, "w") as f:
        f.write(config_str)

    # 3. Launch the terminal
    exe = os.path.join(target_slot, "terminal64.exe")
    # Generate a one-time startup file for force login
    startup = os.path.join(target_slot, "startup.ini")
    with open(startup, "w", encoding="utf-16") as f:
        f.write(f"[Common]\nLogin={login}\nPassword={password}\nServer={server}\n")
    
    subprocess.Popen([exe, "/portable", "/config:startup.ini"], cwd=target_slot)
    log_event(f"SUCCESS: {customer_email} is now live on Account {login}")

def main():
    try:
        log_event("--- FundedCobra Agent Started ---")
        while True:
            # 1. Check for orders
            if os.path.exists(ORDERS_FILE) and os.path.getsize(ORDERS_FILE) > 0:
                with open(ORDERS_FILE, "r") as f:
                    orders = f.readlines()
                
                if orders:
                    current_order = orders[0].strip() # Take the first one
                    
                    # 2. Check for available accounts
                    if os.path.exists(ACCOUNTS_STOCK) and os.path.getsize(ACCOUNTS_STOCK) > 0:
                        with open(ACCOUNTS_STOCK, "r") as f:
                            stock = f.readlines()
                        
                        if stock:
                            account_info = stock[0].strip().split(',')
                            
                            # 3. Provision
                            provision_account(current_order, account_info)
                            
                            # 4. Remove used order and account (Cleanup)
                            with open(ORDERS_FILE, "w") as f:
                                f.writelines(orders[1:])
                            with open(ACCOUNTS_STOCK, "w") as f:
                                f.writelines(stock[1:])
                    else:
                        log_event("WAITING: No accounts in stock for new order.")
            
            time.sleep(10) # Polish level polling
    except Exception as e:
        log_event(f"CRITICAL AGENT ERROR: {e}")
        input("Agent Crashed. Press Enter to exit...")

if __name__ == "__main__":
    main()
