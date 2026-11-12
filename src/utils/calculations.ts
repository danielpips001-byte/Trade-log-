export interface TradeCalculationResult {
  distanceToSl: number;
  distanceToTp: number;
  pipsToSl: number;
  pipsToTp: number;
  estimatedLoss: number;
  estimatedProfit: number;
  riskReward: number;
  isEstimate: boolean;
  unitLabel: string;
}

export function getCurrencySymbol(currency?: string): string {
  switch (currency) {
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'JPY':
      return '¥';
    case 'NGN':
      return '₦';
    case 'AUD':
    case 'USD':
    default:
      return '$';
  }
}

/**
 * Calculates estimated profit/loss, distance, and RR ratio
 * based on instrument symbol, lot size, direction, entry, SL, and TP.
 */
export function calculateTradeEstimates(
  symbolInput: string,
  direction: 'BUY' | 'SELL',
  entry: number,
  stopLoss: number,
  takeProfit: number,
  lotSize: number
): TradeCalculationResult | null {
  if (!symbolInput || !entry || entry <= 0 || !lotSize || lotSize <= 0) {
    return null;
  }

  const symbol = symbolInput.toUpperCase().trim();
  const hasSl = stopLoss > 0;
  const hasTp = takeProfit > 0;

  if (!hasSl && !hasTp) return null;

  // Calculate price differences based on direction
  const slDiff = direction === 'BUY' ? (entry - stopLoss) : (stopLoss - entry);
  const tpDiff = direction === 'BUY' ? (takeProfit - entry) : (entry - takeProfit);

  let contractSize = 100000; // Default forex standard lot
  let pipMultiplier = 10000;
  let unitLabel = 'pips';
  let isEstimate = false;

  // Gold (XAUUSD / GOLD)
  if (symbol.includes('XAU') || symbol.includes('GOLD')) {
    contractSize = 100; // 100 oz per lot
    pipMultiplier = 10; // $0.10 per pip or $1 per point
    unitLabel = 'pts';
  } 
  // Silver (XAGUSD / SILVER)
  else if (symbol.includes('XAG') || symbol.includes('SILVER')) {
    contractSize = 5000; // 5,000 oz per lot
    pipMultiplier = 100;
    unitLabel = 'pts';
  } 
  // JPY Pairs
  else if (symbol.endsWith('JPY')) {
    contractSize = 100000;
    pipMultiplier = 100;
    unitLabel = 'pips';
  } 
  // Indices (US30, NAS100, US100, SPX500, US500, GER30, DAX)
  else if (
    symbol.includes('US30') || 
    symbol.includes('NAS') || 
    symbol.includes('US100') || 
    symbol.includes('SPX') || 
    symbol.includes('US500') || 
    symbol.includes('GER') || 
    symbol.includes('DAX')
  ) {
    contractSize = 1; // standard point multiplier for CFD indices
    pipMultiplier = 1;
    unitLabel = 'pts';
    isEstimate = true; // broker CFD specs vary
  } 
  // Crypto (BTC, ETH, SOL)
  else if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL')) {
    contractSize = 1; // 1 coin per lot
    pipMultiplier = 1;
    unitLabel = 'pts';
  } 
  // Standard Forex (EURUSD, GBPUSD, AUDUSD, USDCAD, etc.)
  else {
    contractSize = 100000;
    pipMultiplier = 10000;
    unitLabel = 'pips';
  }

  // Distance in points/pips
  const pipsToSl = hasSl ? Math.abs(Number((slDiff * pipMultiplier).toFixed(1))) : 0;
  const pipsToTp = hasTp ? Math.abs(Number((tpDiff * pipMultiplier).toFixed(1))) : 0;

  // Estimated dollar profit / loss
  // For Gold: diff ($) * 100 oz * lots
  // For Forex: diff * 100,000 * lots (for USD quote)
  // For Indices: diff (pts) * lots * multiplier
  let estimatedLoss = 0;
  let estimatedProfit = 0;

  if (hasSl) {
    const rawLoss = Math.abs(slDiff) * contractSize * lotSize;
    estimatedLoss = Number(rawLoss.toFixed(2));
  }

  if (hasTp) {
    const rawProfit = Math.abs(tpDiff) * contractSize * lotSize;
    estimatedProfit = Number(rawProfit.toFixed(2));
  }

  // Risk to Reward Ratio
  let riskReward = 0;
  if (hasSl && hasTp && slDiff > 0 && tpDiff > 0) {
    riskReward = Number((tpDiff / slDiff).toFixed(2));
  }

  return {
    distanceToSl: Number(Math.abs(slDiff).toFixed(4)),
    distanceToTp: Number(Math.abs(tpDiff).toFixed(4)),
    pipsToSl,
    pipsToTp,
    estimatedLoss,
    estimatedProfit,
    riskReward,
    isEstimate,
    unitLabel
  };
}
