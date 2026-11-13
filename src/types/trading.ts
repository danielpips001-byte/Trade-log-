export type AccountType = 'Prop Firm' | 'Live' | 'Demo';

export type AccountCurrency = 'USD' | 'EUR' | 'GBP' | 'AUD' | 'JPY' | 'NGN';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  broker?: string;
  startingBalance: number;
  currentBalance: number;
  currency: AccountCurrency;
  createdAt: string;
}

export type InstrumentCategory = 'Forex' | 'Metal' | 'Index' | 'Crypto' | 'CFD';

export interface InstrumentSpec {
  symbol: string; // Uppercase identifier e.g. EURUSD, USDJPY, XAUUSD, US30
  category: InstrumentCategory;
  contractSize: number; // e.g. 100000 for FX, 100 for XAUUSD, 5000 for XAGUSD
  tickSize: number; // Minimum price increment e.g. 0.00001, 0.001, 0.01
  tickValueProfit?: number; // Broker-provided tick value per 1.00 lot in tickValueCurrency
  tickValueLoss?: number; // Broker-provided tick value per 1.00 lot in tickValueCurrency
  tickValueCurrency?: string; // Currency of broker tick values (usually account currency)
  pipSize?: number; // Standard pip size where applicable (e.g. 0.0001, 0.01)
  quoteCurrency: string; // Quote currency of the instrument (e.g. USD, JPY, EUR)
  baseCurrency?: string; // Base currency if FX pair (e.g. USD for USDJPY, EUR for EURUSD)
  minLot: number; // Broker minimum lot size (e.g. 0.01)
  maxLot: number; // Broker maximum lot size (e.g. 100)
  lotStep: number; // Broker lot step increment (e.g. 0.01)
  isCustom?: boolean; // True if user edited/added via broker specification editor
  updatedAt?: string;
}

export type ExchangeRateMap = Record<string, number>; // e.g. { "USD_NGN": 1650, "USD_JPY": 152.4 }

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
  realizedPnl: number; // Net realized P/L for Closed trades (0 for Open trades)
  grossRealizedPnl?: number; // Price P/L before commission & swap
  commission?: number; // Cost deducted (positive magnitude e.g. 7.00 or negative)
  swap?: number; // Financing credit/debit (+ or -)
  date: string; // YYYY-MM-DD (entry date)
  time?: string; // HH:mm
  status: TradeStatus; // 'Open' or 'Closed'
  closeOutcome?: CloseOutcome;
  closedAt?: string; // HH:mm
  closedDate?: string; // YYYY-MM-DD
  strategy?: string;
  notes?: string;

  // Estimated projections kept strictly separate from realized P/L
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

export type ActiveTab = 'tools' | 'journal' | 'performance';
