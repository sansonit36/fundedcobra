# MT5 Integration Analysis - Riverton Markets

## Overview
This folder contains all files related to the MT5 (MetaTrader 5) live account data integration with Supabase and MySQL databases.

## Data Flow

### 1. **Data Ingestion Points**

#### `insert_data.php`
- **Purpose**: Receives live MT5 account balance data
- **Endpoint**: POST request
- **Data Fields Accepted**:
  - `mt5_id` - Account identifier
  - `client_name` - Trader name
  - `daily_drawdown_limit` - Maximum daily loss allowed (%)
  - `overall_drawdown_limit` - Maximum overall loss allowed (%)
  - `weekly_profit_target` - Profit target for the week (%)
  - `running_balance` - Current account balance ($)
  - `running_equity` - Current equity ($)
  - `largest_single_trade_profit_week` - Best trade profit this week ($)
  - `trades_under_60s_week` - Number of trades under 60 seconds this week

**Processing Flow**:
1. Receives raw POST data via `php://input`
2. Saves raw data to `received_data.json` for debugging
3. Validates JSON format
4. Sends data to Supabase via REST API (`account_data_extended` table)
5. Uses upsert logic: updates if `mt5_id` exists, inserts if new
6. Logs all operations to `debug_log.txt`

---

#### `update_trading_account.php`
- **Purpose**: Receives trading account status updates (breach alerts, rule violations)
- **Endpoint**: POST request
- **Data Fields Accepted**:
  - `mt5_login` - MT5 account login ID
  - `status` - Account status (e.g., "breached", "active", "suspended")
  - `breach_reason` - Reason for breach (e.g., "daily limit hit", "overall drawdown exceeded")

**Processing Flow**:
1. Receives raw POST data
2. Saves data to `received_trading_account.json`
3. Validates required fields (`mt5_login` is required)
4. Sends PATCH request to Supabase (`trading_accounts` table) filtered by `mt5_login`
5. Updates only `status` and `breach_reason` fields
6. Logs all operations to `debug_log_update.txt`

---

#### `rcv.php` (receive_and_store.php)
- **Purpose**: Alternative receiver with MySQL direct storage
- **Endpoint**: POST request
- **Storage**: Direct MySQL database write (not Supabase)
- **Table**: `account_data_extended`

**Processing Flow**:
1. Receives JSON data via POST
2. Validates required fields: `mt5_id`, `client_name`, `running_balance`, `running_equity`
3. Executes MySQL upsert: INSERT with ON DUPLICATE KEY UPDATE
4. Stores in local MySQL database
5. Logs raw data to `raw_data_log.json`

---

#### `upload_data_extended.php`
- **Purpose**: Similar to `rcv.php`, direct MySQL upsert
- **Storage**: MySQL database
- **Table**: `account_data_extended`

**Note**: Highly similar to `rcv.php` - potential code duplication.

---

## Database Endpoints

### Supabase Configuration
- **URL**: `https://wdgqsltxvpjyghjuavvf.supabase.co`
- **API Key**: Embedded in PHP files (security concern)
- **Tables Used**:
  1. `account_data_extended` - Stores MT5 account live data
  2. `trading_accounts` - Stores trading account status & breach info

### MySQL Database
- **Host**: `u427305155_rivertonm` (Hostinger)
- **Database**: `u427305155_rivertonm`
- **Table**: `account_data_extended`
- **Operation**: Upsert on duplicate `mt5_id`

---

## Data Synchronization

### Dual-Write Strategy
The system implements **dual writes**: data is sent to both:
1. **Supabase** (cloud-based, REST API) - via `insert_data.php` and `update_trading_account.php`
2. **MySQL** (local, direct) - via `rcv.php` and `upload_data_extended.php`

This provides:
- **Redundancy**: Data exists in two places
- **API Access**: Supabase provides REST API access
- **Local Backup**: MySQL provides direct database access

---

## Sample Data

### Account Data (insert_data.php)
```json
{
  "mt5_id": "435148397",
  "client_name": "Shehzad Sultan",
  "daily_drawdown_limit": 8,
  "overall_drawdown_limit": 12,
  "weekly_profit_target": 10,
  "running_balance": 10319.16,
  "running_equity": 10319.16,
  "largest_single_trade_profit_week": 0,
  "trades_under_60s_week": 0
}
```

### Trading Account Status (update_trading_account.php)
```json
{
  "mt5_login": "435304224",
  "status": "breached",
  "breach_reason": "daily limit hit"
}
```

---

## Debug Logging

### Log Files Generated
1. **debug_log.txt** - Full logs from `insert_data.php`
   - Raw POST data
   - Parsed JSON
   - Supabase request headers and response
   - HTTP status codes

2. **debug_log_update.txt** - Full logs from `update_trading_account.php`
   - POST data
   - Supabase PATCH request details
   - Response codes

3. **raw_data_log.json** - From `rcv.php`
   - Raw POST data appended line-by-line

---

## Security Concerns

⚠️ **API Keys Exposed**: Supabase API keys are hardcoded in PHP files and visible in debug logs
⚠️ **Database Credentials**: MySQL credentials in plain text in PHP files
⚠️ **Sensitive Data**: Client names, balances, and MT5 IDs stored in JSON files in web root
⚠️ **Debug Mode**: Error reporting enabled in production code
⚠️ **No Authentication**: No validation that requests come from legitimate MT5 systems

---

## File Structure
```
MT5_INTEGRATION_ANALYSIS/
├── insert_data.php                          # Main account data receiver
├── update_trading_account.php               # Trading account status receiver
├── rcv.php                                  # MySQL direct storage
├── upload_data_extended.php                 # MySQL upsert alternative
├── SAMPLE_received_data.json                # Example account data
├── SAMPLE_received_trading_account.json     # Example status data
├── README.md                                # This file
└── MT5_Data_Flow.html                       # Interactive flow diagram
```

---

## How MT5 Sends Data

**Source**: MetaTrader 5 platform or external integration service

**Methods** (likely):
1. **HTTP POST** to `insert_data.php` with account data (recurring, e.g., every minute)
2. **HTTP POST** to `update_trading_account.php` with status updates (on rule violations)

**Trigger Points**:
- Account balance updates (daily/real-time)
- Rule violations (drawdown exceeded, profit target hit)
- Trade limit violations (60-second trades)

---

## Related Integration Points

This MT5 integration connects to:
- **Affiliate System** (`/affiliate/`) - Tracks referrals and commissions
- **Account Management** (`/account/`) - User dashboard
- **Blog System** (`/blog/`) - Educational content about trading rules
- **API System** (`/api/`) - Purchase tracking and registration

---

## Conclusion

The MT5 integration is a **dual-write system** that:
1. Receives live trading data from MT5 systems
2. Validates and processes the data
3. Stores in both Supabase (cloud) and MySQL (local)
4. Provides real-time account status tracking
5. Enables trader account monitoring and rule enforcement
