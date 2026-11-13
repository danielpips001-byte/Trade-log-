import { Account, ExchangeRateMap, InstrumentSpec, TradeDirection } from '../types/trading';

export const STARTER_INSTRUMENT_SPECS: Record<string, InstrumentSpec> = {
  EURUSD: {
    symbol: 'EURUSD',
    category: 'Forex',
    contractSize: 100000,
    tickSize: 0.00001,
    pipSize: 0.0001,
    quoteCurrency: 'USD',
    baseCurrency: 'EUR',
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    isCustom: false
  },
  GBPUSD: {
    symbol: 'GBPUSD',
    category: 'Forex',
    contractSize: 100000,
    tickSize: 0.00001,
    pipSize: 0.0001,
    quoteCurrency: 'USD',
    baseCurrency: 'GBP',
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    isCustom: false
  },
  USDJPY: {
    symbol: 'USDJPY',
    category: 'Forex',
    contractSize: 100000,
    tickSize: 0.001,
    pipSize: 0.01,
    quoteCurrency: 'JPY',
    baseCurrency: 'USD',
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    isCustom: false
  },
  XAUUSD: {
    symbol: 'XAUUSD',
    category: 'Metal',
    contractSize: 100,
    tickSize: 0.01,
    pipSize: 0.1,
    quoteCurrency: 'USD',
    baseCurrency: 'XAU',
    minLot: 0.01,
    maxLot: 50,
    lotStep: 0.01,
    isCustom: false
  },
  XAGUSD: {
    symbol: 'XAGUSD',
    category: 'Metal',
    contractSize: 5000,
    tickSize: 0.001,
    pipSize: 0.01,
    quoteCurrency: 'USD',
    baseCurrency: 'XAG',
    minLot: 0.01,
    maxLot: 50,
    lotStep: 0.01,
    isCustom: false
  }
};

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

export function formatMoney(amount: number, currency?: string, includeSign = false): string {
  const sym = getCurrencySymbol(currency);
  const absFormatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  if (includeSign) {
    return `${amount >= 0 ? '+' : '-'}${sym}${absFormatted}`;
  }
  return `${amount < 0 ? '-' : ''}${sym}${absFormatted}`;
}

export function formatRiskReward(rr: number): string {
  if (!rr || !isFinite(rr) || rr <= 0) return '—';
  const rounded = Number(rr.toFixed(2));
  return Number.isInteger(rounded) ? `1:${rounded}` : `1:${rounded.toFixed(2)}`;
}

export function countStepDecimals(step: number): number {
  if (!isFinite(step) || step <= 0) return 2;
  const s = step.toString();
  if (s.includes('e-')) {
    return parseInt(s.split('e-')[1], 10) || 2;
  }
  const idx = s.indexOf('.');
  return idx === -1 ? 0 : s.length - idx - 1;
}

export type ConversionResolution =
  | {
      ok: true;
      rate: number;
      source: 'identity' | 'user_rate' | 'inverse_user_rate' | 'bridge_usd' | 'trade_price';
      label: string;
    }
  | {
      ok: false;
      from: string;
      to: string;
      pairKey: string;
      message: string;
    };

/**
 * Resolves currency conversion WITHOUT hardcoded exchange rates.
 * Priority:
 * 1. Same currency (1.0)
 * 2. Direct user-configured rate (FROM_TO)
 * 3. Inverse user-configured rate (TO_FROM)
 * 4. Two-hop bridge via USD using user-configured rates
 * 5. Spot trade price identity when the traded pair's baseCurrency === accountCurrency (e.g. USDJPY on USD account)
 * 6. Otherwise returns missing rate error prompting user to configure the rate.
 */
export function resolveConversionRate(
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: ExchangeRateMap,
  options?: {
    baseCurrency?: string;
    targetPrice?: number;
  }
): ConversionResolution {
  const from = fromCurrency.toUpperCase().trim();
  const to = toCurrency.toUpperCase().trim();

  if (from === to) {
    return { ok: true, rate: 1, source: 'identity', label: `1:1 (${from})` };
  }

  const directKey = `${from}_${to}`;
  const directRate = exchangeRates[directKey];
  if (directRate && directRate > 0) {
    return {
      ok: true,
      rate: directRate,
      source: 'user_rate',
      label: `1 ${from} = ${directRate} ${to}`
    };
  }

  const inverseKey = `${to}_${from}`;
  const inverseRate = exchangeRates[inverseKey];
  if (inverseRate && inverseRate > 0) {
    return {
      ok: true,
      rate: 1 / inverseRate,
      source: 'inverse_user_rate',
      label: `1 ${to} = ${inverseRate} ${from}`
    };
  }

  // Try 2-hop bridge through USD if user configured both legs
  if (from !== 'USD' && to !== 'USD') {
    const leg1 =
      exchangeRates[`${from}_USD`] ||
      (exchangeRates[`USD_${from}`] ? 1 / exchangeRates[`USD_${from}`] : 0);
    const leg2 =
      exchangeRates[`USD_${to}`] ||
      (exchangeRates[`${to}_USD`] ? 1 / exchangeRates[`${to}_USD`] : 0);

    if (leg1 > 0 && leg2 > 0) {
      const combined = leg1 * leg2;
      return {
        ok: true,
        rate: combined,
        source: 'bridge_usd',
        label: `1 ${from} = ${combined.toFixed(4)} ${to} (via USD)`
      };
    }
  }

  // Exact mathematical identity for pairs whose baseCurrency equals accountCurrency (e.g. USDJPY on USD account)
  if (
    options?.baseCurrency &&
    options.baseCurrency.toUpperCase().trim() === to &&
    options.targetPrice &&
    options.targetPrice > 0
  ) {
    return {
      ok: true,
      rate: 1 / options.targetPrice,
      source: 'trade_price',
      label: `1 ${to} = ${options.targetPrice} ${from} (at trade price)`
    };
  }

  let suggestedKey = `${from}_${to}`;
  if (from === 'USD') {
    suggestedKey = `USD_${to}`;
  } else if (to === 'USD') {
    suggestedKey = ['EUR', 'GBP', 'AUD', 'NZD'].includes(from) ? `${from}_USD` : `USD_${from}`;
  }

  return {
    ok: false,
    from,
    to,
    pairKey: suggestedKey,
    message: `Missing conversion rate between ${from} and ${to}.`
  };
}

export interface TradeMetricsResult {
  status: 'ok' | 'invalid_prices' | 'missing_spec' | 'missing_conversion' | 'incomplete';
  errors: string[];
  missingSpecSymbol?: string;
  missingConversion?: { from: string; to: string; suggestedKey: string };

  slDistancePrice: number;
  tpDistancePrice: number;
  slTicks: number;
  tpTicks: number;
  slPips: number;
  tpPips: number;
  unitLabel: 'pips' | 'ticks';

  estimatedRisk: number | null;
  estimatedProfit: number | null;
  riskReward: number | null;

  riskConversionLabel?: string;
  profitConversionLabel?: string;
  usedBrokerTickValues: boolean;
}

export function calculateTradeMetrics(params: {
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  lotSize: number;
  accountCurrency: string;
  specsMap: Record<string, InstrumentSpec>;
  exchangeRates: ExchangeRateMap;
}): TradeMetricsResult {
  const {
    symbol,
    direction,
    entryPrice,
    stopLoss,
    takeProfit,
    lotSize,
    accountCurrency,
    specsMap,
    exchangeRates
  } = params;

  const cleanSymbol = symbol.toUpperCase().trim();
  const baseEmpty: TradeMetricsResult = {
    status: 'incomplete',
    errors: [],
    slDistancePrice: 0,
    tpDistancePrice: 0,
    slTicks: 0,
    tpTicks: 0,
    slPips: 0,
    tpPips: 0,
    unitLabel: 'pips',
    estimatedRisk: null,
    estimatedProfit: null,
    riskReward: null,
    usedBrokerTickValues: false
  };

  if (!cleanSymbol) {
    return { ...baseEmpty, errors: ['Enter an instrument symbol.'] };
  }

  const spec = specsMap[cleanSymbol];
  if (!spec) {
    return {
      ...baseEmpty,
      status: 'missing_spec',
      missingSpecSymbol: cleanSymbol,
      errors: [`No broker specification saved for ${cleanSymbol}. Configure contract size, tick size, and quote currency.`]
    };
  }

  const unitLabel: 'pips' | 'ticks' = spec.pipSize && spec.pipSize > 0 ? 'pips' : 'ticks';

  if (!entryPrice || entryPrice <= 0 || !isFinite(entryPrice)) {
    return { ...baseEmpty, unitLabel, errors: ['Enter a valid entry price.'] };
  }

  if (!lotSize || lotSize <= 0 || !isFinite(lotSize)) {
    return { ...baseEmpty, unitLabel, errors: ['Enter a valid lot size greater than 0.'] };
  }

  const hasSl = stopLoss !== undefined && stopLoss > 0 && isFinite(stopLoss);
  const hasTp = takeProfit !== undefined && takeProfit > 0 && isFinite(takeProfit);

  const errors: string[] = [];
  if (hasSl) {
    if (direction === 'BUY' && stopLoss! >= entryPrice) {
      errors.push('Invalid BUY Stop Loss: Stop Loss must be below Entry Price.');
    }
    if (direction === 'SELL' && stopLoss! <= entryPrice) {
      errors.push('Invalid SELL Stop Loss: Stop Loss must be above Entry Price.');
    }
  }
  if (hasTp) {
    if (direction === 'BUY' && takeProfit! <= entryPrice) {
      errors.push('Invalid BUY Take Profit: Take Profit must be above Entry Price.');
    }
    if (direction === 'SELL' && takeProfit! >= entryPrice) {
      errors.push('Invalid SELL Take Profit: Take Profit must be below Entry Price.');
    }
  }

  if (errors.length > 0) {
    return {
      ...baseEmpty,
      status: 'invalid_prices',
      unitLabel,
      errors
    };
  }

  if (!hasSl && !hasTp) {
    return { ...baseEmpty, status: 'incomplete', unitLabel };
  }

  const slDistancePrice = hasSl ? Number(Math.abs(entryPrice - stopLoss!).toFixed(6)) : 0;
  const tpDistancePrice = hasTp ? Number(Math.abs(takeProfit! - entryPrice).toFixed(6)) : 0;

  const slTicks = hasSl && spec.tickSize > 0 ? Number((slDistancePrice / spec.tickSize).toFixed(2)) : 0;
  const tpTicks = hasTp && spec.tickSize > 0 ? Number((tpDistancePrice / spec.tickSize).toFixed(2)) : 0;

  const slPips = hasSl
    ? Number((spec.pipSize && spec.pipSize > 0 ? slDistancePrice / spec.pipSize : slTicks).toFixed(2))
    : 0;
  const tpPips = hasTp
    ? Number((spec.pipSize && spec.pipSize > 0 ? tpDistancePrice / spec.pipSize : tpTicks).toFixed(2))
    : 0;

  let estimatedRisk: number | null = null;
  let estimatedProfit: number | null = null;
  let riskConversionLabel: string | undefined;
  let profitConversionLabel: string | undefined;
  let missingConversion: { from: string; to: string; suggestedKey: string } | undefined;
  let usedBrokerTickValues = false;

  if (hasSl) {
    if (spec.tickValueLoss && spec.tickValueLoss > 0 && spec.tickSize > 0) {
      usedBrokerTickValues = true;
      const tickCurr = (spec.tickValueCurrency || accountCurrency).toUpperCase();
      const conv = resolveConversionRate(tickCurr, accountCurrency, exchangeRates);
      if (conv.ok) {
        estimatedRisk = Number((slTicks * spec.tickValueLoss * lotSize * conv.rate).toFixed(2));
        riskConversionLabel = `Broker tick loss (${spec.tickValueLoss} ${tickCurr}/tick) · ${conv.label}`;
      } else {
        missingConversion = { from: conv.from, to: conv.to, suggestedKey: conv.pairKey };
      }
    } else {
      const conv = resolveConversionRate(spec.quoteCurrency, accountCurrency, exchangeRates, {
        baseCurrency: spec.baseCurrency,
        targetPrice: stopLoss
      });
      if (conv.ok) {
        const lossQuote = slDistancePrice * spec.contractSize * lotSize;
        estimatedRisk = Number((lossQuote * conv.rate).toFixed(2));
        riskConversionLabel = conv.label;
      } else {
        missingConversion = { from: conv.from, to: conv.to, suggestedKey: conv.pairKey };
      }
    }
  }

  if (hasTp) {
    if (spec.tickValueProfit && spec.tickValueProfit > 0 && spec.tickSize > 0) {
      usedBrokerTickValues = true;
      const tickCurr = (spec.tickValueCurrency || accountCurrency).toUpperCase();
      const conv = resolveConversionRate(tickCurr, accountCurrency, exchangeRates);
      if (conv.ok) {
        estimatedProfit = Number((tpTicks * spec.tickValueProfit * lotSize * conv.rate).toFixed(2));
        profitConversionLabel = `Broker tick profit (${spec.tickValueProfit} ${tickCurr}/tick) · ${conv.label}`;
      } else if (!missingConversion) {
        missingConversion = { from: conv.from, to: conv.to, suggestedKey: conv.pairKey };
      }
    } else {
      const conv = resolveConversionRate(spec.quoteCurrency, accountCurrency, exchangeRates, {
        baseCurrency: spec.baseCurrency,
        targetPrice: takeProfit
      });
      if (conv.ok) {
        const profitQuote = tpDistancePrice * spec.contractSize * lotSize;
        estimatedProfit = Number((profitQuote * conv.rate).toFixed(2));
        profitConversionLabel = conv.label;
      } else if (!missingConversion) {
        missingConversion = { from: conv.from, to: conv.to, suggestedKey: conv.pairKey };
      }
    }
  }

  if (missingConversion) {
    return {
      ...baseEmpty,
      status: 'missing_conversion',
      missingConversion,
      slDistancePrice,
      tpDistancePrice,
      slTicks,
      tpTicks,
      slPips,
      tpPips,
      unitLabel,
      usedBrokerTickValues,
      errors: [`Exchange rate required: ${missingConversion.from} -> ${missingConversion.to}`]
    };
  }

  let riskReward: number | null = null;
  if (estimatedRisk && estimatedRisk > 0 && estimatedProfit && estimatedProfit > 0) {
    riskReward = Number((estimatedProfit / estimatedRisk).toFixed(2));
  }

  return {
    status: 'ok',
    errors: [],
    slDistancePrice,
    tpDistancePrice,
    slTicks,
    tpTicks,
    slPips,
    tpPips,
    unitLabel,
    estimatedRisk,
    estimatedProfit,
    riskReward,
    riskConversionLabel,
    profitConversionLabel,
    usedBrokerTickValues
  };
}

export interface RealizedPnlResult {
  status: 'ok' | 'missing_spec' | 'missing_conversion' | 'invalid';
  error?: string;
  missingSpecSymbol?: string;
  missingConversion?: { from: string; to: string; suggestedKey: string };
  grossPnl: number;
  commissionFee: number;
  swapAmount: number;
  netPnl: number;
  conversionLabel?: string;
}

export function calculateRealizedTradePnl(params: {
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
  commission?: number;
  swap?: number;
  accountCurrency: string;
  specsMap: Record<string, InstrumentSpec>;
  exchangeRates: ExchangeRateMap;
}): RealizedPnlResult {
  const {
    symbol,
    direction,
    entryPrice,
    exitPrice,
    lotSize,
    commission = 0,
    swap = 0,
    accountCurrency,
    specsMap,
    exchangeRates
  } = params;

  const cleanSymbol = symbol.toUpperCase().trim();
  const spec = specsMap[cleanSymbol];
  if (!spec) {
    return {
      status: 'missing_spec',
      missingSpecSymbol: cleanSymbol,
      error: `Missing broker specification for ${cleanSymbol}.`,
      grossPnl: 0,
      commissionFee: 0,
      swapAmount: 0,
      netPnl: 0
    };
  }

  if (!entryPrice || entryPrice <= 0 || !exitPrice || exitPrice <= 0 || !lotSize || lotSize <= 0) {
    return {
      status: 'invalid',
      error: 'Valid entry price, exit price, and lot size are required.',
      grossPnl: 0,
      commissionFee: 0,
      swapAmount: 0,
      netPnl: 0
    };
  }

  const signedDiff = direction === 'BUY' ? exitPrice - entryPrice : entryPrice - exitPrice;
  const absDiff = Math.abs(signedDiff);
  const isGain = signedDiff >= 0;
  const ticks = spec.tickSize > 0 ? absDiff / spec.tickSize : 0;

  let grossMag = 0;
  let conversionLabel = '';

  const brokerTickVal = isGain ? spec.tickValueProfit : spec.tickValueLoss;
  if (brokerTickVal && brokerTickVal > 0 && spec.tickSize > 0) {
    const tickCurr = (spec.tickValueCurrency || accountCurrency).toUpperCase();
    const conv = resolveConversionRate(tickCurr, accountCurrency, exchangeRates);
    if (!conv.ok) {
      return {
        status: 'missing_conversion',
        missingConversion: { from: conv.from, to: conv.to, suggestedKey: conv.pairKey },
        error: conv.message,
        grossPnl: 0,
        commissionFee: 0,
        swapAmount: 0,
        netPnl: 0
      };
    }
    grossMag = ticks * brokerTickVal * lotSize * conv.rate;
    conversionLabel = conv.label;
  } else {
    const conv = resolveConversionRate(spec.quoteCurrency, accountCurrency, exchangeRates, {
      baseCurrency: spec.baseCurrency,
      targetPrice: exitPrice
    });
    if (!conv.ok) {
      return {
        status: 'missing_conversion',
        missingConversion: { from: conv.from, to: conv.to, suggestedKey: conv.pairKey },
        error: conv.message,
        grossPnl: 0,
        commissionFee: 0,
        swapAmount: 0,
        netPnl: 0
      };
    }
    grossMag = absDiff * spec.contractSize * lotSize * conv.rate;
    conversionLabel = conv.label;
  }

  const grossPnl = Number((isGain ? grossMag : -grossMag).toFixed(2));
  const commissionFee = Number(Math.abs(commission || 0).toFixed(2));
  const swapAmount = Number((swap || 0).toFixed(2));
  const netPnl = Number((grossPnl - commissionFee + swapAmount).toFixed(2));

  return {
    status: 'ok',
    grossPnl,
    commissionFee,
    swapAmount,
    netPnl,
    conversionLabel
  };
}

export interface LotSizeCalculationResult {
  status: 'ok' | 'missing_spec' | 'missing_conversion' | 'invalid';
  errors: string[];
  warnings: string[];
  missingSpecSymbol?: string;
  missingConversion?: { from: string; to: string; suggestedKey: string };

  intendedRiskAmount: number;
  intendedRiskPercent: number;
  riskPerOneLot: number;

  rawLots: number;
  recommendedLots: number; // Strictly rounded DOWN to lotStep and clamped to [minLot, maxLot]
  activeLots: number; // Manual override if provided, else recommendedLots

  exactRiskAmount: number;
  exactRiskPercent: number;
  potentialRewardAmount: number | null;
  potentialRewardPercent: number | null;
  riskReward: number | null;
  tpInvalidWarning?: string;

  slDistancePrice: number;
  slDistancePips: number;
  slDistanceTicks: number;
  unitLabel: 'pips' | 'ticks';
  conversionLabel?: string;
}

export function calculateLotSize(params: {
  symbol: string;
  accountBalance: number;
  accountCurrency: string;
  riskMode: 'percent' | 'amount';
  riskValue: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  specsMap: Record<string, InstrumentSpec>;
  exchangeRates: ExchangeRateMap;
  manualLotOverride?: number | null;
}): LotSizeCalculationResult {
  const {
    symbol,
    accountBalance,
    accountCurrency,
    riskMode,
    riskValue,
    entryPrice,
    stopLoss,
    takeProfit,
    specsMap,
    exchangeRates,
    manualLotOverride
  } = params;

  const cleanSymbol = symbol.toUpperCase().trim();
  const baseFail = (
    status: LotSizeCalculationResult['status'],
    errors: string[]
  ): LotSizeCalculationResult => ({
    status,
    errors,
    warnings: [],
    intendedRiskAmount: 0,
    intendedRiskPercent: 0,
    riskPerOneLot: 0,
    rawLots: 0,
    recommendedLots: 0,
    activeLots: 0,
    exactRiskAmount: 0,
    exactRiskPercent: 0,
    potentialRewardAmount: null,
    potentialRewardPercent: null,
    riskReward: null,
    slDistancePrice: 0,
    slDistancePips: 0,
    slDistanceTicks: 0,
    unitLabel: 'pips'
  });

  if (!cleanSymbol) return baseFail('invalid', ['Enter a trading symbol.']);

  const spec = specsMap[cleanSymbol];
  if (!spec) {
    return {
      ...baseFail('missing_spec', [`Missing broker specification for ${cleanSymbol}.`]),
      missingSpecSymbol: cleanSymbol
    };
  }

  if (!accountBalance || accountBalance <= 0) {
    return baseFail('invalid', ['Enter an account balance greater than 0.']);
  }
  if (!riskValue || riskValue <= 0) {
    return baseFail('invalid', ['Enter a risk amount or percentage greater than 0.']);
  }
  if (!entryPrice || entryPrice <= 0 || !stopLoss || stopLoss <= 0) {
    return baseFail('invalid', ['Enter valid Entry and Stop Loss prices.']);
  }
  if (entryPrice === stopLoss) {
    return baseFail('invalid', ['Entry price and Stop Loss cannot be identical.']);
  }

  const intendedRiskAmount =
    riskMode === 'percent' ? (accountBalance * riskValue) / 100 : riskValue;
  const intendedRiskPercent =
    riskMode === 'percent' ? riskValue : (intendedRiskAmount / accountBalance) * 100;

  // Infer direction from entry & stopLoss so Buy and Sell both work naturally
  const inferredDirection: TradeDirection = stopLoss < entryPrice ? 'BUY' : 'SELL';

  // Compute exact monetary risk for 1.00 lot using the same unified engine
  const oneLotMetrics = calculateTradeMetrics({
    symbol: cleanSymbol,
    direction: inferredDirection,
    entryPrice,
    stopLoss,
    lotSize: 1.0,
    accountCurrency,
    specsMap,
    exchangeRates
  });

  if (oneLotMetrics.status === 'missing_conversion') {
    return {
      ...baseFail('missing_conversion', oneLotMetrics.errors),
      missingConversion: oneLotMetrics.missingConversion,
      slDistancePrice: oneLotMetrics.slDistancePrice,
      slDistancePips: oneLotMetrics.slPips,
      slDistanceTicks: oneLotMetrics.slTicks,
      unitLabel: oneLotMetrics.unitLabel
    };
  }

  if (oneLotMetrics.status !== 'ok' || !oneLotMetrics.estimatedRisk || oneLotMetrics.estimatedRisk <= 0) {
    return baseFail('invalid', oneLotMetrics.errors.length ? oneLotMetrics.errors : ['Unable to calculate risk per lot.']);
  }

  const riskPerOneLot = oneLotMetrics.estimatedRisk;
  const rawLots = intendedRiskAmount / riskPerOneLot;
  const step = spec.lotStep > 0 ? spec.lotStep : 0.01;
  const decimals = countStepDecimals(step);

  // Strictly round DOWN to nearest permitted lotStep so calculated risk never exceeds intended risk
  const flooredSteps = Math.floor(rawLots / step + 1e-9);
  let recommendedLots = Number((flooredSteps * step).toFixed(decimals));

  const warnings: string[] = [];
  if (recommendedLots < spec.minLot) {
    warnings.push(
      `Calculated lot (${rawLots.toFixed(decimals + 1)}) is below broker minimum (${spec.minLot} lots). Rounding down gives 0 lots; using ${spec.minLot} lots would risk ${formatMoney(spec.minLot * riskPerOneLot, accountCurrency)}.`
    );
    recommendedLots = 0;
  } else if (recommendedLots > spec.maxLot) {
    warnings.push(`Calculated lot size capped at broker maximum of ${spec.maxLot} lots.`);
    recommendedLots = spec.maxLot;
  }

  const hasManual = manualLotOverride !== undefined && manualLotOverride !== null && !isNaN(manualLotOverride) && manualLotOverride >= 0;
  const activeLots = hasManual ? manualLotOverride! : recommendedLots;

  if (hasManual) {
    if (activeLots > 0 && activeLots < spec.minLot) {
      warnings.push(`Manual lot (${activeLots}) is below broker min lot (${spec.minLot}).`);
    }
    if (activeLots > spec.maxLot) {
      warnings.push(`Manual lot (${activeLots}) exceeds broker max lot (${spec.maxLot}).`);
    }
  }

  const exactRiskAmount = Number((activeLots * riskPerOneLot).toFixed(2));
  const exactRiskPercent = accountBalance > 0 ? Number(((exactRiskAmount / accountBalance) * 100).toFixed(2)) : 0;

  let potentialRewardAmount: number | null = null;
  let potentialRewardPercent: number | null = null;
  let riskReward: number | null = null;
  let tpInvalidWarning: string | undefined;

  if (takeProfit !== undefined && takeProfit > 0 && isFinite(takeProfit)) {
    const validTpSide =
      (inferredDirection === 'BUY' && takeProfit > entryPrice) ||
      (inferredDirection === 'SELL' && takeProfit < entryPrice);

    if (!validTpSide) {
      tpInvalidWarning =
        inferredDirection === 'BUY'
          ? 'Inferred BUY setup (SL below Entry): Take Profit must be above Entry Price.'
          : 'Inferred SELL setup (SL above Entry): Take Profit must be below Entry Price.';
    } else if (activeLots > 0) {
      const rewardMetrics = calculateTradeMetrics({
        symbol: cleanSymbol,
        direction: inferredDirection,
        entryPrice,
        stopLoss,
        takeProfit,
        lotSize: activeLots,
        accountCurrency,
        specsMap,
        exchangeRates
      });
      if (rewardMetrics.status === 'ok' && rewardMetrics.estimatedProfit !== null) {
        potentialRewardAmount = rewardMetrics.estimatedProfit;
        potentialRewardPercent =
          accountBalance > 0 ? Number(((potentialRewardAmount / accountBalance) * 100).toFixed(2)) : 0;
        if (exactRiskAmount > 0) {
          riskReward = Number((potentialRewardAmount / exactRiskAmount).toFixed(2));
        }
      }
    }
  }

  return {
    status: 'ok',
    errors: [],
    warnings,
    intendedRiskAmount: Number(intendedRiskAmount.toFixed(2)),
    intendedRiskPercent: Number(intendedRiskPercent.toFixed(2)),
    riskPerOneLot: Number(riskPerOneLot.toFixed(2)),
    rawLots: Number(rawLots.toFixed(4)),
    recommendedLots,
    activeLots,
    exactRiskAmount,
    exactRiskPercent,
    potentialRewardAmount,
    potentialRewardPercent,
    riskReward,
    tpInvalidWarning,
    slDistancePrice: oneLotMetrics.slDistancePrice,
    slDistancePips: oneLotMetrics.slPips,
    slDistanceTicks: oneLotMetrics.slTicks,
    unitLabel: oneLotMetrics.unitLabel,
    conversionLabel: oneLotMetrics.riskConversionLabel
  };
}

export interface CurrencySubtotal {
  currency: string;
  accountCount: number;
  startingBalance: number;
  currentBalance: number;
  netReturn: number;
}

export interface MultiCurrencyPortfolioSummary {
  subtotalsByCurrency: CurrencySubtotal[];
  isSingleCurrency: boolean;
  convertedTotal: {
    ok: true;
    reportingCurrency: string;
    totalStartingBalance: number;
    totalCurrentBalance: number;
    totalNetReturn: number;
    ratesUsed: string[];
  } | {
    ok: false;
    reportingCurrency: string;
    missingConversions: { from: string; to: string; suggestedKey: string }[];
  };
}

/**
 * Aggregates multiple accounts without ever mixing different currencies (e.g. NGN + USD).
 * Separate subtotals are always kept per currency. An overall converted total is computed
 * ONLY when explicit exchange rates exist to convert every account into reportingCurrency.
 */
export function aggregateMultiCurrencyAccounts(
  accounts: Account[],
  exchangeRates: ExchangeRateMap,
  reportingCurrency: string
): MultiCurrencyPortfolioSummary {
  const byCurrency = new Map<string, CurrencySubtotal>();

  for (const acc of accounts) {
    const curr = (acc.currency || 'USD').toUpperCase();
    const existing = byCurrency.get(curr) || {
      currency: curr,
      accountCount: 0,
      startingBalance: 0,
      currentBalance: 0,
      netReturn: 0
    };
    existing.accountCount += 1;
    existing.startingBalance = Number((existing.startingBalance + (acc.startingBalance || 0)).toFixed(2));
    existing.currentBalance = Number((existing.currentBalance + (acc.currentBalance || 0)).toFixed(2));
    existing.netReturn = Number((existing.currentBalance - existing.startingBalance).toFixed(2));
    byCurrency.set(curr, existing);
  }

  const subtotalsByCurrency = Array.from(byCurrency.values()).sort((a, b) =>
    a.currency.localeCompare(b.currency)
  );
  const isSingleCurrency = subtotalsByCurrency.length <= 1;

  const targetCurr = reportingCurrency.toUpperCase();
  const missingMap = new Map<string, { from: string; to: string; suggestedKey: string }>();
  const ratesUsedSet = new Set<string>();

  let totalStartingBalance = 0;
  let totalCurrentBalance = 0;

  for (const sub of subtotalsByCurrency) {
    const conv = resolveConversionRate(sub.currency, targetCurr, exchangeRates);
    if (!conv.ok) {
      missingMap.set(conv.pairKey, {
        from: conv.from,
        to: conv.to,
        suggestedKey: conv.pairKey
      });
    } else {
      if (conv.source !== 'identity') {
        ratesUsedSet.add(conv.label);
      }
      totalStartingBalance += sub.startingBalance * conv.rate;
      totalCurrentBalance += sub.currentBalance * conv.rate;
    }
  }

  if (missingMap.size > 0) {
    return {
      subtotalsByCurrency,
      isSingleCurrency,
      convertedTotal: {
        ok: false,
        reportingCurrency: targetCurr,
        missingConversions: Array.from(missingMap.values())
      }
    };
  }

  const cleanStarting = Number(totalStartingBalance.toFixed(2));
  const cleanCurrent = Number(totalCurrentBalance.toFixed(2));
  return {
    subtotalsByCurrency,
    isSingleCurrency,
    convertedTotal: {
      ok: true,
      reportingCurrency: targetCurr,
      totalStartingBalance: cleanStarting,
      totalCurrentBalance: cleanCurrent,
      totalNetReturn: Number((cleanCurrent - cleanStarting).toFixed(2)),
      ratesUsed: Array.from(ratesUsedSet)
    }
  };
}
