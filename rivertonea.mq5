//+------------------------------------------------------------------+
//|                                                   rivertonea.mq5   |
//|                                          Copyright 2024, Riverton   |
//+------------------------------------------------------------------+
#property copyright "Copyright 2024, Riverton"
#property link      "https://rivertonmarkets.com"
#property version   "1.00"
#property strict
#property description "Riverton Markets MT5 Expert Advisor"

// Include required libraries
#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\OrderInfo.mqh>
#include <JAson.mqh>

// Constants
#define MIN_TRADE_TIME 60    // 1 minute minimum trade duration
#define MAX_PROFIT_TARGET 25 // 25% max profit per trade
#define UPDATE_INTERVAL 1    // 1 second
#define DAILY_DRAWDOWN 12    // 12% daily drawdown limit
#define OVERALL_DRAWDOWN 40  // 40% overall drawdown limit

// API Configuration
#define SUPABASE_URL "https://iznfadkldpsdrshlmpyc.supabase.co"
#define SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6bmZhZGtsZHBzZHJzaGxtcHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2NDAyMjAsImV4cCI6MjA1MzIxNjIyMH0.DGhr0heQJqwjv7c41ajUisssjGsA8mRz3h65htqtIrc"

// Global variables
CTrade trade;
CPositionInfo position;
COrderInfo order;
CJAVal json;
string accountId;
double dailyHighEquity;
double startingBalance;
datetime lastUpdateTime;
datetime dailyResetTime;
bool isBreached;

// Trade tracking map
struct TradeTime {
   datetime openTime;
   double openPrice;
};
TradeTime tradeMap[];

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit() {
   // Set account ID
   accountId = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   
   // Initialize daily high equity and starting balance
   dailyHighEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   startingBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   dailyResetTime = TimeTradeServer() + PeriodSeconds(PERIOD_D1);
   
   // Reset breach status
   isBreached = false;
   
   // Send initial account state
   SendAccountUpdate();
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
   ArrayFree(tradeMap);
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick() {
   // Skip if account is breached
   if(isBreached) return;

   // Check if it's time to reset daily high equity
   if(TimeTradeServer() >= dailyResetTime) {
      dailyHighEquity = AccountInfoDouble(ACCOUNT_EQUITY);
      dailyResetTime = TimeTradeServer() + PeriodSeconds(PERIOD_D1);
   }
   
   // Update daily high equity if current equity is higher
   double currentEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   if(currentEquity > dailyHighEquity) {
      dailyHighEquity = currentEquity;
   }
   
   // Check drawdown limits
   double dailyDrawdown = ((dailyHighEquity - currentEquity) / dailyHighEquity) * 100;
   double overallDrawdown = ((startingBalance - currentEquity) / startingBalance) * 100;
   
   if(dailyDrawdown >= DAILY_DRAWDOWN || overallDrawdown >= OVERALL_DRAWDOWN) {
      isBreached = true;
      string reason = dailyDrawdown >= DAILY_DRAWDOWN ? 
         "Daily drawdown limit exceeded" : 
         "Overall drawdown limit exceeded";
      
      // Close all positions
      CloseAllPositions();
      
      // Send breach notification
      NotifyBreach(reason);
      return;
   }
   
   // Send periodic updates
   if(TimeTradeServer() - lastUpdateTime >= UPDATE_INTERVAL) {
      SendAccountUpdate();
      lastUpdateTime = TimeTradeServer();
   }
}

//+------------------------------------------------------------------+
//| TradeTransaction function                                         |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                       const MqlTradeRequest& request,
                       const MqlTradeResult& result) {
   // Handle new positions
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD) {
      if(trans.deal_type == DEAL_TYPE_BUY || trans.deal_type == DEAL_TYPE_SELL) {
         int idx = ArraySize(tradeMap);
         ArrayResize(tradeMap, idx + 1);
         tradeMap[idx].openTime = TimeTradeServer();
         tradeMap[idx].openPrice = trans.price;
      }
   }
   
   // Handle closed positions
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD && trans.deal_type == DEAL_TYPE_BALANCE) {
      for(int i = ArraySize(tradeMap) - 1; i >= 0; i--) {
         // Check minimum trade duration
         if(TimeTradeServer() - tradeMap[i].openTime < MIN_TRADE_TIME) {
            Print("Warning: Trade closed too quickly - minimum duration is 1 minute");
         }
         
         // Get position details for profit calculation
         if(HistorySelectByPosition(trans.position)) {
            ulong dealTicket = HistoryDealGetTicket(0); // Get first deal (open)
            if(dealTicket > 0) {
               double openPrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
               dealTicket = HistoryDealGetTicket(1); // Get second deal (close)
               if(dealTicket > 0) {
                  double closePrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
                  double dealProfit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
                  
                  // Calculate profit percentage
                  double profitPercent = (MathAbs(dealProfit) / AccountInfoDouble(ACCOUNT_BALANCE)) * 100;
                  
                  if(profitPercent > MAX_PROFIT_TARGET) {
                     Print("Warning: Trade profit exceeds maximum allowed - capping at 25%");
                  }
               }
            }
         }
         
         // Remove trade from tracking
         if(i < ArraySize(tradeMap) - 1)
            ArrayCopy(tradeMap, tradeMap, i, i + 1, ArraySize(tradeMap) - i - 1);
         ArrayResize(tradeMap, ArraySize(tradeMap) - 1);
         break;
      }
   }
   
   // Send immediate update for any trade activity
   SendAccountUpdate();
}

//+------------------------------------------------------------------+
//| Close all open positions                                          |
//+------------------------------------------------------------------+
void CloseAllPositions() {
   for(int i = PositionsTotal() - 1; i >= 0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0) {
         trade.PositionClose(ticket);
      }
   }
}

//+------------------------------------------------------------------+
//| Send account update to backend                                    |
//+------------------------------------------------------------------+
void SendAccountUpdate() {
   // Clear previous JSON
   json.Clear();
   
   // Add account data
   json["accountId"] = accountId;
   json["balance"] = NormalizeDouble(AccountInfoDouble(ACCOUNT_BALANCE), 2);
   json["equity"] = NormalizeDouble(AccountInfoDouble(ACCOUNT_EQUITY), 2);
   json["margin"] = NormalizeDouble(AccountInfoDouble(ACCOUNT_MARGIN), 2);
   json["freeMargin"] = NormalizeDouble(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 2);
   json["marginLevel"] = NormalizeDouble(AccountInfoDouble(ACCOUNT_MARGIN_LEVEL), 2);
   json["dailyHighEquity"] = NormalizeDouble(dailyHighEquity, 2);
   
   // Add open positions
   CJAVal trades;
   int total = PositionsTotal();
   for(int i = 0; i < total; i++) {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0) {
         CJAVal trade;
         trade["ticket"] = (long)ticket;
         trade["symbol"] = PositionGetString(POSITION_SYMBOL);
         trade["type"] = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "buy" : "sell");
         trade["volume"] = NormalizeDouble(PositionGetDouble(POSITION_VOLUME), 2);
         trade["openPrice"] = NormalizeDouble(PositionGetDouble(POSITION_PRICE_OPEN), 5);
         trade["openTime"] = TimeToString((datetime)PositionGetInteger(POSITION_TIME), TIME_DATE|TIME_SECONDS);
         trade["stopLoss"] = NormalizeDouble(PositionGetDouble(POSITION_SL), 5);
         trade["takeProfit"] = NormalizeDouble(PositionGetDouble(POSITION_TP), 5);
         trade["profit"] = NormalizeDouble(PositionGetDouble(POSITION_PROFIT), 2);
         trades.Add(trade);
      }
   }
   json["trades"].Set(trades);
   
   // Send update to Supabase
   string jsonStr = json.Serialize();
   Print("Sending account update: ", jsonStr);
   SendRequest("POST", "/rest/v1/mt5_updates", jsonStr);
}

//+------------------------------------------------------------------+
//| Send breach notification                                          |
//+------------------------------------------------------------------+
void NotifyBreach(const string reason) {
   // Clear previous JSON
   json.Clear();
   
   // Add breach data
   json["accountId"] = accountId;
   json["reason"] = reason;
   json["equity"] = NormalizeDouble(AccountInfoDouble(ACCOUNT_EQUITY), 2);
   json["balance"] = NormalizeDouble(AccountInfoDouble(ACCOUNT_BALANCE), 2);
   
   // Send breach notification to Supabase
   string jsonStr = json.Serialize();
   SendRequest("POST", "/rest/v1/mt5_breaches", jsonStr);
}

//+------------------------------------------------------------------+
//| Send HTTP request to Supabase                                     |
//+------------------------------------------------------------------+
void SendRequest(const string method, const string endpoint, const string data) {
   string headers = "Content-Type: application/json\r\n" +
                   "apikey: " + SUPABASE_ANON_KEY + "\r\n" +
                   "Authorization: Bearer " + SUPABASE_ANON_KEY + "\r\n" +
                   "Prefer: return=minimal\r\n";
   
   char post[], result[];
   StringToCharArray(data, post);
   
   int res = WebRequest(
      method,
      SUPABASE_URL + endpoint,
      headers,
      5000,
      post,
      result,
      headers
   );
   
   if(res == -1) {
      int error = GetLastError();
      Print("Error sending request: ", error);
      
      // Handle common errors
      if(error == 4014)
         Print("No internet connection");
      else if(error == 4015)
         Print("Request timeout");
      else
         Print("HTTP error: ", error);
   }
}