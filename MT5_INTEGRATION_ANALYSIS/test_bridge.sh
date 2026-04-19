#!/bin/bash

# MT5 Bridge Local Test Script
# This script starts a local PHP server, sends a mock MT5 update, and verifies Supabase connectivity.

PORT=8080
URL="http://localhost:$PORT/insert_data.php"

echo "------------------------------------------------"
echo "🚀 Starting MT5 Bridge Local Test"
echo "------------------------------------------------"

# 1. Start PHP built-in server in the background
echo "📥 Starting local PHP server on port $PORT..."
php -S localhost:$PORT > /dev/null 2>&1 &
PHP_PID=$!

# Give the server a moment to start
sleep 2

# 2. Prepare mock data
MOCK_DATA='{
  "mt5_id": "LOCAL_TEST_888",
  "client_name": "Antigravity Test",
  "initial_equity": 50000.00,
  "running_balance": 51200.00,
  "running_equity": 51150.00,
  "trades": [
    {
      "ticket": "test_tkt_101",
      "symbol": "XAUUSD",
      "type": "buy",
      "volume": 0.5,
      "open_price": 2030.50,
      "close_price": 2035.00,
      "profit": 450.00,
      "open_time": "'$(date +"%Y-%m-%d %H:%M:%S")'",
      "close_time": "'$(date +"%Y-%m-%d %H:%M:%S")'"
    }
  ]
}'

# 3. Send the request via cURL
echo "📤 Sending mock MT5 update to $URL..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$URL" \
     -H "Content-Type: application/json" \
     -d "$MOCK_DATA")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

# 4. Cleanup PHP server
echo "🛑 Stopping local PHP server (PID: $PHP_PID)..."
kill $PHP_PID

# 5. Report Results
echo "------------------------------------------------"
if [ "$HTTP_CODE" -eq 204 ] || [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ TEST SUCCESSFUL!"
    echo "Status Code: $HTTP_CODE"
    echo "Supabase Response: $BODY"
else
    echo "❌ TEST FAILED"
    echo "Status Code: $HTTP_CODE"
    echo "Error Body: $BODY"
    echo ""
    echo "💡 Check debug_log.txt for more details."
fi
echo "------------------------------------------------"
