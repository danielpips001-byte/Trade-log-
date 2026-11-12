export type AccountType = 'Prop Firm' | 'Live' | 'Demo';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  broker?: string;
  startingBalance: number;
  currentBalance: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'AUD' | 'JPY' | 'NGN';
  createdAt: string;
}

export type TradeDirection = 'BUY' | 'SELL';
export type TradeStatus = 'Open' | 'Closed';
export type CloseOutcome = 'Take Profit Hit' | 'Stop Loss Hit' | 'Breakeven' | 'Closed Manually';

export interface Trade {
  id: string;
  accountId: string;
  asset: string;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  exitPrice?: number;
  lotSize: number;
  realizedPnl: number; // 0 for Open trades; only closed trades have realized PnL
  date: string; // YYYY-MM-DD (entry date)
  time?: string; // HH:mm
  status: TradeStatus; // 'Open' or 'Closed'
  closeOutcome?: CloseOutcome;
  closedAt?: string; // timestamp or HH:mm
  closedDate?: string; // YYYY-MM-DD
  strategy?: string;
  notes?: string;

  // Real-time calculations stored for reference
  estimatedProfit?: number;
  estimatedLoss?: number;
  estimatedRR?: number;
  riskRewardRatio?: number;
  pipsToSl?: number;
  pipsToTp?: number;
  isEstimate?: boolean;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  notes: string;
  emotions?: string;
  mistakes?: string;
  lessons?: string;
}

export interface TradingRule {
  id: string;
  text: string;
  isActive: boolean;
}

export type ActiveTab = 'calendar' | 'trades' | 'add' | 'journal' | 'accounts';
