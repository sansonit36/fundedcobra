//+------------------------------------------------------------------+
//|                                               RivertonMarkets.mq5 |
//|                                          Copyright 2024, Riverton |
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
string accountId;
double dailyHighEquity;
double startingBalance;
datetime lastUpdateTime;
datetime dailyResetTime;

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
   
   // Send initial account state
   SendAccountUpdate();
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
   // Clean up any global variables
   GlobalVariablesDeleteAll();
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick() {
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
      // Close all positions if drawdown limits are breached
      CloseAllPositions();
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
   // Store trade open time for new positions
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD) {
      if(trans.deal_type == DEAL_TYPE_BUY || trans.deal_type == DEAL_TYPE_SELL) {
         GlobalVariableSet("trade_" + IntegerToString(trans.position), TimeTradeServer());
      }
   }
   
   // Check rules for closed positions
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD && trans.deal_type == DEAL_TYPE_BALANCE) {
      ulong posTicket = trans.position;
      datetime openTime = (datetime)GlobalVariableGet("trade_" + IntegerToString(posTicket));
      
      if(openTime > 0) {
         // Check minimum trade duration
         if(TimeTradeServer() - openTime < MIN_TRADE_TIME) {
            Print("Warning: Trade #", posTicket, " closed too quickly - minimum duration is 1 minute");
         }
         
         // Get position details for profit calculation
         if(HistorySelectByPosition(posTicket)) {
            ulong dealTicket = HistoryDealGetTicket(0); // Get first deal (open)
            if(dealTicket > 0) {
               double openPrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
               dealTicket = HistoryDealGetTicket(1); // Get second deal (close)
               if(dealTicket > 0) {
                  double closePrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
                  double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
                  
                  // Check maximum profit
                  double profitPercent = (MathAbs(profit) / AccountInfoDouble(ACCOUNT_BALANCE)) * 100;
                  if(profitPercent > MAX_PROFIT_TARGET) {
                     Print("Warning: Trade #", posTicket, " profit exceeds maximum allowed - capping at 25%");
                  }
               }
            }
         }
         
         // Clean up trade tracking
         GlobalVariableDel("trade_" + IntegerToString(posTicket));
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
   // Prepare account data
   string json = "{";
   json += "\"accountId\":\"" + accountId + "\",";
   json += "\"balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
   json += "\"equity\":" + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2) + ",";
   json += "\"margin\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN), 2) + ",";
   json += "\"freeMargin\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 2) + ",";
   json += "\"marginLevel\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_LEVEL), 2) + ",";
   json += "\"dailyHighEquity\":" + DoubleToString(dailyHighEquity, 2) + ",";
   
   // Add open positions
   json += "\"trades\":[";
   int total = PositionsTotal();
   for(int i = 0; i < total; i++) {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0) {
         if(i > 0) json += ",";
         json += "{";
         json += "\"ticket\":" + IntegerToString(ticket) + ",";
         json += "\"symbol\":\"" + PositionGetString(POSITION_SYMBOL) + "\",";
         json += "\"type\":\"" + (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "buy" : "sell") + "\",";
         json += "\"volume\":" + DoubleToString(PositionGetDouble(POSITION_VOLUME), 2) + ",";
         json += "\"openPrice\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), 5) + ",";
         json += "\"openTime\":\"" + TimeToString((datetime)PositionGetInteger(POSITION_TIME), TIME_DATE|TIME_SECONDS) + "\",";
         json += "\"stopLoss\":" + DoubleToString(PositionGetDouble(POSITION_SL), 5) + ",";
         json += "\"takeProfit\":" + DoubleToString(PositionGetDouble(POSITION_TP), 5) + ",";
         json += "\"profit\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT), 2);
         json += "}";
      }
   }
   json += "]";
   json += "}";
   
   // Prepare headers with authentication
   string headers = "Content-Type: application/json\r\n" +
                   "apikey: " + SUPABASE_ANON_KEY + "\r\n" +
                   "Authorization: Bearer " + SUPABASE_ANON_KEY + "\r\n" +
                   "Prefer: return=minimal\r\n";
   
   char post[], result[];
   StringToCharArray(json, post);
   
   int res = WebRequest(
      "POST",
      SUPABASE_URL + "/rest/v1/mt5_updates",
      headers,
      5000,
      post,
      result,
      headers
   );
   
   if(res == -1) {
      int error = GetLastError();
      Print("Error sending update: ", error);
      
      // Handle common errors