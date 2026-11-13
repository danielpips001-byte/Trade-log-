import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Account,
  Trade,
  JournalEntry,
  TradingRule,
  ActiveTab,
  CloseOutcome,
  InstrumentSpec,
  ExchangeRateMap
} from '../types/trading';
import { STARTER_INSTRUMENT_SPECS } from '../utils/calculations';
import { db, sanitizeForFirestore } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot
} from 'firebase/firestore';

interface TradingContextType {
  workspaceId: string;
  switchWorkspace: (syncKey: string) => Promise<void>;

  accounts: Account[];
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
  activeAccount: Account | undefined;
  addAccount: (account: {
    name: string;
    type: Account['type'];
    broker?: string;
    startingBalance: number;
    currency: Account['currency'];
  }) => Promise<Account>;
  updateAccount: (
    accountId: string,
    updates: {
      name?: string;
      type?: Account['type'];
      broker?: string;
      currency?: Account['currency'];
      currentBalance?: number;
    }
  ) => Promise<void>;
  updateAccountBalance: (accountId: string, newBalance: number) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;

  trades: Trade[];
  filteredTrades: Trade[];
  addTrade: (
    trade: Omit<Trade, 'id' | 'status' | 'realizedPnl'> & {
      realizedPnl?: number;
      status?: 'Open' | 'Closed';
    }
  ) => Promise<Trade>;
  closeTrade: (
    tradeId: string,
    closeData: {
      outcome: CloseOutcome;
      exitPrice: number;
      realizedPnl: number;
      grossRealizedPnl?: number;
      commission?: number;
      swap?: number;
      closedDate: string;
      closedAt: string;
      notes?: string;
    }
  ) => Promise<void>;
  updateTrade: (trade: Trade) => Promise<void>;
  deleteTrade: (tradeId: string) => Promise<void>;

  selectedTradeId: string | null;
  setSelectedTradeId: (id: string | null) => void;
  selectedTrade: Trade | undefined;

  journalEntries: JournalEntry[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id'>) => Promise<JournalEntry>;
  deleteJournalEntry: (id: string) => Promise<void>;

  rules: TradingRule[];
  addRule: (text: string) => Promise<TradingRule>;
  toggleRule: (id: string) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;

  instrumentSpecs: Record<string, InstrumentSpec>;
  saveInstrumentSpec: (spec: InstrumentSpec) => Promise<InstrumentSpec>;
  deleteInstrumentSpec: (symbol: string) => Promise<void>;
  exchangeRates: ExchangeRateMap;
  saveExchangeRate: (pairKey: string, rate: number) => Promise<void>;
  deleteExchangeRate: (pairKey: string) => Promise<void>;
  specModalSymbol: string | null;
  setSpecModalSymbol: (symbol: string | null) => void;

  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  selectedCalendarDate: string;
  setSelectedCalendarDate: (date: string) => void;

  isAccountModalOpen: boolean;
  setIsAccountModalOpen: (open: boolean) => void;
  isAddTradeModalOpen: boolean;
  setIsAddTradeModalOpen: (open: boolean) => void;
  journalViewMode: 'weekly' | 'calendar';
  setJournalViewMode: (mode: 'weekly' | 'calendar') => void;

  firestoreStatus: 'connected' | 'syncing' | 'offline';
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const WORKSPACE_ID_STORAGE_KEY = 'tradelog_workspace_id_v1';

function generateWorkspaceId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TL-${suffix}`;
}

function getInitialWorkspaceId(): string {
  try {
    const existing = localStorage.getItem(WORKSPACE_ID_STORAGE_KEY);
    if (existing && /^[A-Za-z0-9_-]{4,64}$/.test(existing.trim())) {
      return existing.trim().toUpperCase();
    }
  } catch {
    // ignore storage errors
  }
  const fresh = generateWorkspaceId();
  try {
    localStorage.setItem(WORKSPACE_ID_STORAGE_KEY, fresh);
  } catch {
    // ignore storage errors
  }
  return fresh;
}

function getWorkspaceStorageKeys(wsId: string) {
  const prefix = `tradelog_ws_${wsId}`;
  return {
    accounts: `${prefix}_accounts`,
    selectedAccount: `${prefix}_selected_acc`,
    trades: `${prefix}_trades`,
    journal: `${prefix}_journal`,
    rules: `${prefix}_rules`,
    specs: `${prefix}_specs`,
    rates: `${prefix}_rates`
  };
}

function readCachedJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  ms = 12000,
  errorMsg = 'Database request timed out. Please check your connection.'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
  ]);
}

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaceId, setWorkspaceId] = useState<string>(() => getInitialWorkspaceId());

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const keys = getWorkspaceStorageKeys(getInitialWorkspaceId());
    return readCachedJson<Account[]>(keys.accounts, []);
  });

  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    const keys = getWorkspaceStorageKeys(getInitialWorkspaceId());
    return localStorage.getItem(keys.selectedAccount) || '';
  });

  const [trades, setTrades] = useState<Trade[]>(() => {
    const keys = getWorkspaceStorageKeys(getInitialWorkspaceId());
    return readCachedJson<Trade[]>(keys.trades, []);
  });

  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    const keys = getWorkspaceStorageKeys(getInitialWorkspaceId());
    return readCachedJson<JournalEntry[]>(keys.journal, []);
  });

  const [rules, setRules] = useState<TradingRule[]>(() => {
    const keys = getWorkspaceStorageKeys(getInitialWorkspaceId());
    return readCachedJson<TradingRule[]>(keys.rules, []);
  });

  const [instrumentSpecs, setInstrumentSpecs] = useState<Record<string, InstrumentSpec>>(() => {
    const keys = getWorkspaceStorageKeys(getInitialWorkspaceId());
    return readCachedJson<Record<string, InstrumentSpec>>(keys.specs, STARTER_INSTRUMENT_SPECS);
  });

  const [exchangeRates, setExchangeRates] = useState<ExchangeRateMap>(() => {
    const keys = getWorkspaceStorageKeys(getInitialWorkspaceId());
    return readCachedJson<ExchangeRateMap>(keys.rates, {});
  });

  const [specModalSymbol, setSpecModalSymbol] = useState<string | null>(null);

  // Default to 'journal' (center "My Journal" tab)
  const [activeTab, setActiveTab] = useState<ActiveTab>('journal');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAddTradeModalOpen, setIsAddTradeModalOpen] = useState(false);
  const [journalViewMode, setJournalViewMode] = useState<'weekly' | 'calendar'>('weekly');
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');

  // LocalStorage Persistence scoped per workspaceId
  useEffect(() => {
    const keys = getWorkspaceStorageKeys(workspaceId);
    localStorage.setItem(keys.accounts, JSON.stringify(accounts));
  }, [workspaceId, accounts]);

  useEffect(() => {
    const keys = getWorkspaceStorageKeys(workspaceId);
    localStorage.setItem(keys.selectedAccount, selectedAccountId);
  }, [workspaceId, selectedAccountId]);

  useEffect(() => {
    const keys = getWorkspaceStorageKeys(workspaceId);
    localStorage.setItem(keys.trades, JSON.stringify(trades));
  }, [workspaceId, trades]);

  useEffect(() => {
    const keys = getWorkspaceStorageKeys(workspaceId);
    localStorage.setItem(keys.journal, JSON.stringify(journalEntries));
  }, [workspaceId, journalEntries]);

  useEffect(() => {
    const keys = getWorkspaceStorageKeys(workspaceId);
    localStorage.setItem(keys.rules, JSON.stringify(rules));
  }, [workspaceId, rules]);

  useEffect(() => {
    const keys = getWorkspaceStorageKeys(workspaceId);
    localStorage.setItem(keys.specs, JSON.stringify(instrumentSpecs));
  }, [workspaceId, instrumentSpecs]);

  useEffect(() => {
    const keys = getWorkspaceStorageKeys(workspaceId);
    localStorage.setItem(keys.rates, JSON.stringify(exchangeRates));
  }, [workspaceId, exchangeRates]);

  // Ensure selectedAccountId always points to an existing account
  useEffect(() => {
    if (accounts.length === 0) {
      if (selectedAccountId !== '') {
        setSelectedAccountId('');
      }
      return;
    }
    if (selectedAccountId !== 'all') {
      const exists = accounts.some((a) => a.id === selectedAccountId);
      if (!exists) {
        setSelectedAccountId(accounts[0].id);
      }
    }
  }, [accounts, selectedAccountId]);

  // Real-time Firestore sync isolated to workspaces/{workspaceId}/...
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setFirestoreStatus('syncing');

    try {
      // 1. Trades
      unsubs.push(
        onSnapshot(
          collection(db, 'workspaces', workspaceId, 'trades'),
          (snapshot) => {
            setFirestoreStatus('connected');
            const list: Trade[] = [];
            snapshot.forEach((docSnap) => {
              list.push({ id: docSnap.id, ...docSnap.data() } as Trade);
            });
            list.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
            setTrades(list);
          },
          (err) => {
            console.warn('Firestore trades listener notice:', err.message);
            setFirestoreStatus('offline');
          }
        )
      );

      // 2. Accounts
      unsubs.push(
        onSnapshot(
          collection(db, 'workspaces', workspaceId, 'accounts'),
          (snapshot) => {
            setFirestoreStatus('connected');
            const list: Account[] = [];
            snapshot.forEach((docSnap) => {
              list.push({ id: docSnap.id, ...docSnap.data() } as Account);
            });
            list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
            setAccounts(list);
          },
          (err) => {
            console.warn('Firestore accounts listener notice:', err.message);
            setFirestoreStatus('offline');
          }
        )
      );

      // 3. Trading Rules
      unsubs.push(
        onSnapshot(
          collection(db, 'workspaces', workspaceId, 'rules'),
          (snapshot) => {
            const list: TradingRule[] = [];
            snapshot.forEach((docSnap) => {
              list.push({ id: docSnap.id, ...docSnap.data() } as TradingRule);
            });
            setRules(list);
          },
          (err) => {
            console.warn('Firestore rules listener notice:', err.message);
          }
        )
      );

      // 4. Journal Entries
      unsubs.push(
        onSnapshot(
          collection(db, 'workspaces', workspaceId, 'journal'),
          (snapshot) => {
            const list: JournalEntry[] = [];
            snapshot.forEach((docSnap) => {
              list.push({ id: docSnap.id, ...docSnap.data() } as JournalEntry);
            });
            list.sort((a, b) => b.date.localeCompare(a.date));
            setJournalEntries(list);
          },
          (err) => {
            console.warn('Firestore journal listener notice:', err.message);
          }
        )
      );

      // 5. Broker Instrument Specifications (starter presets + user's saved overrides)
      unsubs.push(
        onSnapshot(
          collection(db, 'workspaces', workspaceId, 'instrumentSpecs'),
          (snapshot) => {
            const customMap: Record<string, InstrumentSpec> = {};
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as InstrumentSpec;
              const key = (data.symbol || docSnap.id).toUpperCase().trim();
              customMap[key] = { ...data, symbol: key };
            });
            setInstrumentSpecs({ ...STARTER_INSTRUMENT_SPECS, ...customMap });
          },
          (err) => {
            console.warn('Firestore instrumentSpecs listener notice:', err.message);
          }
        )
      );

      // 6. User-Configured Currency Conversion Rates
      unsubs.push(
        onSnapshot(
          doc(db, 'workspaces', workspaceId, 'exchangeRates', 'rates'),
          (docSnap) => {
            if (docSnap.exists()) {
              const raw = docSnap.data() as Record<string, unknown>;
              const cleanRates: ExchangeRateMap = {};
              for (const [k, v] of Object.entries(raw)) {
                if (typeof v === 'number' && v > 0) {
                  cleanRates[k] = v;
                }
              }
              setExchangeRates(cleanRates);
            } else {
              setExchangeRates({});
            }
          },
          (err) => {
            console.warn('Firestore exchangeRates listener notice:', err.message);
          }
        )
      );
    } catch (e) {
      console.warn('Firestore setup warning:', e);
      setFirestoreStatus('offline');
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [workspaceId]);

  const switchWorkspace = async (syncKeyInput: string): Promise<void> => {
    const cleanId = syncKeyInput.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{4,64}$/.test(cleanId)) {
      throw new Error('Please enter a valid Sync Key (4–64 letters, numbers, hyphens, or underscores).');
    }
    if (cleanId === workspaceId) {
      return;
    }

    const accountsSnap = await withTimeout(
      getDocs(collection(db, 'workspaces', cleanId, 'accounts'))
    );
    if (accountsSnap.empty) {
      throw new Error('No accounts found for that Sync Key. Check the key or create a new account.');
    }

    const loadedAccounts: Account[] = accountsSnap.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Account)
    );
    loadedAccounts.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

    localStorage.setItem(WORKSPACE_ID_STORAGE_KEY, cleanId);
    setSelectedTradeId(null);
    setTrades([]);
    setJournalEntries([]);
    setRules([]);
    setExchangeRates({});
    setInstrumentSpecs(STARTER_INSTRUMENT_SPECS);
    setAccounts(loadedAccounts);
    setSelectedAccountId(loadedAccounts[0]?.id || '');
    setWorkspaceId(cleanId);
  };

  // Filtered trades by account
  const filteredTrades =
    selectedAccountId === 'all'
      ? trades
      : trades.filter((t) => t.accountId === selectedAccountId);

  const activeAccount =
    selectedAccountId === 'all'
      ? undefined
      : accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const selectedTrade = trades.find((t) => t.id === selectedTradeId);

  // Account Actions
  const addAccount = async (data: {
    name: string;
    type: Account['type'];
    broker?: string;
    startingBalance: number;
    currency: Account['currency'];
  }): Promise<Account> => {
    if (!data.name.trim()) {
      throw new Error('Please enter an account name.');
    }
    const cleanBalance = isNaN(data.startingBalance) ? 0 : Number(data.startingBalance.toFixed(2));
    const newAcc: Account = {
      id: `acc-${Date.now()}`,
      name: data.name.trim(),
      type: data.type,
      broker: data.broker?.trim() || undefined,
      startingBalance: cleanBalance,
      currentBalance: cleanBalance,
      currency: data.currency,
      createdAt: new Date().toISOString().split('T')[0]
    };

    try {
      await withTimeout(
        setDoc(doc(db, 'workspaces', workspaceId, 'accounts', newAcc.id), sanitizeForFirestore(newAcc))
      );
    } catch (err: any) {
      throw new Error(err?.message || 'Failed to save account to Firestore.');
    }

    setAccounts((prev) => {
      if (prev.some((a) => a.id === newAcc.id)) return prev;
      return [...prev, newAcc];
    });
    setSelectedAccountId(newAcc.id);
    return newAcc;
  };

  const updateAccount = async (
    accountId: string,
    updates: {
      name?: string;
      type?: Account['type'];
      broker?: string;
      currency?: Account['currency'];
      currentBalance?: number;
    }
  ) => {
    const target = accounts.find((a) => a.id === accountId);
    if (!target) {
      throw new Error('Account not found.');
    }

    const cleanName = updates.name !== undefined ? updates.name.trim() : target.name;
    if (!cleanName) {
      throw new Error('Account name cannot be empty.');
    }

    const cleanBal =
      updates.currentBalance !== undefined
        ? Number(updates.currentBalance.toFixed(2))
        : target.currentBalance;

    const updatedAccount: Account = {
      ...target,
      name: cleanName,
      type: updates.type ?? target.type,
      broker: updates.broker !== undefined ? updates.broker.trim() || undefined : target.broker,
      currency: updates.currency ?? target.currency,
      currentBalance: cleanBal
    };

    try {
      await withTimeout(
        setDoc(
          doc(db, 'workspaces', workspaceId, 'accounts', accountId),
          sanitizeForFirestore(updatedAccount)
        )
      );
    } catch (err: any) {
      throw new Error(err?.message || 'Failed to update account in Firestore.');
    }

    setAccounts((prev) => prev.map((a) => (a.id === accountId ? updatedAccount : a)));
  };

  const updateAccountBalance = async (accountId: string, newBalance: number) => {
    await updateAccount(accountId, { currentBalance: newBalance });
  };

  const deleteAccount = async (accountId: string) => {
    if (accounts.length <= 1) {
      throw new Error('You must keep at least one trading account.');
    }
    await withTimeout(deleteDoc(doc(db, 'workspaces', workspaceId, 'accounts', accountId)));
    setAccounts((prev) => {
      const next = prev.filter((a) => a.id !== accountId);
      if (selectedAccountId === accountId && next.length > 0) {
        setSelectedAccountId(next[0].id);
      }
      return next;
    });
  };

  // Trade Actions
  const addTrade = async (
    tradeData: Omit<Trade, 'id' | 'status' | 'realizedPnl'> & {
      realizedPnl?: number;
      status?: 'Open' | 'Closed';
    }
  ): Promise<Trade> => {
    if (!tradeData.asset || !tradeData.asset.trim()) {
      throw new Error('Please enter an instrument symbol (e.g. XAUUSD, EURUSD, BTCUSD).');
    }
    if (!tradeData.entryPrice || isNaN(tradeData.entryPrice) || tradeData.entryPrice <= 0) {
      throw new Error('Please enter a valid entry price greater than 0.');
    }
    if (!tradeData.lotSize || isNaN(tradeData.lotSize) || tradeData.lotSize <= 0) {
      throw new Error('Please enter a valid lot size (e.g. 1.0).');
    }
    if (!tradeData.accountId) {
      throw new Error('Please select a trading account.');
    }

    const newTradeId = `t-${Date.now()}`;
    const newTrade: Trade = {
      ...tradeData,
      id: newTradeId,
      asset: tradeData.asset.toUpperCase().trim(),
      status: 'Open',
      realizedPnl: 0,
      date: tradeData.date || new Date().toISOString().split('T')[0],
      time:
        tradeData.time ||
        new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        })
    };

    const cleanPayload = sanitizeForFirestore(newTrade);
    await withTimeout(setDoc(doc(db, 'workspaces', workspaceId, 'trades', newTradeId), cleanPayload));

    setTrades((prev) => {
      if (prev.some((t) => t.id === newTradeId)) return prev;
      return [newTrade, ...prev];
    });
    return newTrade;
  };

  const closeTrade = async (
    tradeId: string,
    closeData: {
      outcome: CloseOutcome;
      exitPrice: number;
      realizedPnl: number;
      grossRealizedPnl?: number;
      commission?: number;
      swap?: number;
      closedDate: string;
      closedAt: string;
      notes?: string;
    }
  ) => {
    const target = trades.find((t) => t.id === tradeId);
    if (!target) throw new Error('Trade not found.');

    const updated: Trade = {
      ...target,
      status: 'Closed',
      closeOutcome: closeData.outcome,
      exitPrice: closeData.exitPrice,
      realizedPnl: closeData.realizedPnl,
      grossRealizedPnl: closeData.grossRealizedPnl,
      commission: closeData.commission,
      swap: closeData.swap,
      closedDate: closeData.closedDate,
      closedAt: closeData.closedAt,
      notes: closeData.notes
        ? target.notes
          ? `${target.notes}\n\n[Closed]: ${closeData.notes}`
          : closeData.notes
        : target.notes
    };

    await withTimeout(
      setDoc(doc(db, 'workspaces', workspaceId, 'trades', tradeId), sanitizeForFirestore(updated))
    );
    setTrades((prev) => prev.map((t) => (t.id === tradeId ? updated : t)));

    if (target.status === 'Open') {
      const targetAccount = accounts.find((a) => a.id === target.accountId);
      if (targetAccount) {
        const newBal = Number((targetAccount.currentBalance + closeData.realizedPnl).toFixed(2));
        await updateAccountBalance(targetAccount.id, newBal).catch((err) => {
          console.warn('Account balance update warning:', err);
        });
      }
    }
  };

  const updateTrade = async (updated: Trade) => {
    const oldTrade = trades.find((t) => t.id === updated.id);
    let pnlDelta = 0;
    if (oldTrade) {
      if (oldTrade.status === 'Closed' && updated.status === 'Closed') {
        pnlDelta = (updated.realizedPnl || 0) - (oldTrade.realizedPnl || 0);
      } else if (oldTrade.status === 'Open' && updated.status === 'Closed') {
        pnlDelta = updated.realizedPnl || 0;
      } else if (oldTrade.status === 'Closed' && updated.status === 'Open') {
        pnlDelta = -(oldTrade.realizedPnl || 0);
      }
    }

    await withTimeout(
      setDoc(doc(db, 'workspaces', workspaceId, 'trades', updated.id), sanitizeForFirestore(updated))
    );
    setTrades((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

    if (pnlDelta !== 0) {
      const acc = accounts.find((a) => a.id === updated.accountId);
      if (acc) {
        await updateAccountBalance(acc.id, Number((acc.currentBalance + pnlDelta).toFixed(2))).catch(
          () => {}
        );
      }
    }
  };

  const deleteTrade = async (tradeId: string) => {
    const target = trades.find((t) => t.id === tradeId);
    await withTimeout(deleteDoc(doc(db, 'workspaces', workspaceId, 'trades', tradeId)));

    if (target && target.status === 'Closed' && target.realizedPnl) {
      const acc = accounts.find((a) => a.id === target.accountId);
      if (acc) {
        await updateAccountBalance(
          acc.id,
          Number((acc.currentBalance - target.realizedPnl).toFixed(2))
        ).catch(() => {});
      }
    }

    setTrades((prev) => prev.filter((t) => t.id !== tradeId));
    if (selectedTradeId === tradeId) setSelectedTradeId(null);
  };

  // Journal management
  const addJournalEntry = async (entry: Omit<JournalEntry, 'id'>): Promise<JournalEntry> => {
    if (!entry.title.trim()) {
      throw new Error('Please enter a headline for your journal note.');
    }
    const newEntry: JournalEntry = {
      ...entry,
      id: `j-${Date.now()}`
    };

    await withTimeout(
      setDoc(doc(db, 'workspaces', workspaceId, 'journal', newEntry.id), sanitizeForFirestore(newEntry))
    );
    setJournalEntries((prev) => {
      if (prev.some((j) => j.id === newEntry.id)) return prev;
      return [newEntry, ...prev];
    });
    return newEntry;
  };

  const deleteJournalEntry = async (id: string) => {
    await withTimeout(deleteDoc(doc(db, 'workspaces', workspaceId, 'journal', id)));
    setJournalEntries((prev) => prev.filter((j) => j.id !== id));
  };

  // Rules management
  const addRule = async (text: string): Promise<TradingRule> => {
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('Please enter a trading rule.');
    }
    const newRule: TradingRule = {
      id: `r-${Date.now()}`,
      text: cleanText,
      isActive: true
    };

    await withTimeout(
      setDoc(doc(db, 'workspaces', workspaceId, 'rules', newRule.id), sanitizeForFirestore(newRule))
    );
    setRules((prev) => {
      if (prev.some((r) => r.id === newRule.id)) return prev;
      return [...prev, newRule];
    });
    return newRule;
  };

  const toggleRule = async (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (!target) return;
    const updated = { ...target, isActive: !target.isActive };

    setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    await withTimeout(
      setDoc(doc(db, 'workspaces', workspaceId, 'rules', id), sanitizeForFirestore(updated))
    );
  };

  const deleteRule = async (id: string) => {
    await withTimeout(deleteDoc(doc(db, 'workspaces', workspaceId, 'rules', id)));
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  // Instrument Specification Management (Persisted to Firestore)
  const saveInstrumentSpec = async (spec: InstrumentSpec): Promise<InstrumentSpec> => {
    const cleanSymbol = spec.symbol.toUpperCase().trim();
    if (!cleanSymbol) {
      throw new Error('Please enter an instrument symbol.');
    }
    if (!spec.contractSize || spec.contractSize <= 0) {
      throw new Error('Contract size must be greater than 0.');
    }
    if (!spec.tickSize || spec.tickSize <= 0) {
      throw new Error('Tick size must be greater than 0.');
    }
    if (!spec.quoteCurrency || !spec.quoteCurrency.trim()) {
      throw new Error('Quote currency is required.');
    }

    const normalized: InstrumentSpec = {
      ...spec,
      symbol: cleanSymbol,
      quoteCurrency: spec.quoteCurrency.toUpperCase().trim(),
      baseCurrency: spec.baseCurrency?.toUpperCase().trim() || undefined,
      tickValueCurrency: spec.tickValueCurrency?.toUpperCase().trim() || undefined,
      minLot: spec.minLot > 0 ? spec.minLot : 0.01,
      maxLot: spec.maxLot > 0 ? spec.maxLot : 100,
      lotStep: spec.lotStep > 0 ? spec.lotStep : 0.01,
      isCustom: true,
      updatedAt: new Date().toISOString()
    };

    await withTimeout(
      setDoc(
        doc(db, 'workspaces', workspaceId, 'instrumentSpecs', cleanSymbol),
        sanitizeForFirestore(normalized)
      )
    );
    setInstrumentSpecs((prev) => ({ ...prev, [cleanSymbol]: normalized }));
    return normalized;
  };

  const deleteInstrumentSpec = async (symbol: string) => {
    const cleanSymbol = symbol.toUpperCase().trim();
    await withTimeout(deleteDoc(doc(db, 'workspaces', workspaceId, 'instrumentSpecs', cleanSymbol)));
    setInstrumentSpecs((prev) => {
      const next = { ...prev };
      if (STARTER_INSTRUMENT_SPECS[cleanSymbol]) {
        next[cleanSymbol] = STARTER_INSTRUMENT_SPECS[cleanSymbol];
      } else {
        delete next[cleanSymbol];
      }
      return next;
    });
  };

  // Exchange Rate Management (Persisted to Firestore)
  const saveExchangeRate = async (pairKey: string, rate: number) => {
    const cleanKey = pairKey.toUpperCase().trim();
    if (!cleanKey || !rate || rate <= 0 || isNaN(rate)) {
      throw new Error('Please enter a valid positive exchange rate.');
    }
    const nextRates = { ...exchangeRates, [cleanKey]: rate };
    await withTimeout(
      setDoc(
        doc(db, 'workspaces', workspaceId, 'exchangeRates', 'rates'),
        sanitizeForFirestore(nextRates)
      )
    );
    setExchangeRates(nextRates);
  };

  const deleteExchangeRate = async (pairKey: string) => {
    const nextRates = { ...exchangeRates };
    delete nextRates[pairKey];
    await withTimeout(
      setDoc(
        doc(db, 'workspaces', workspaceId, 'exchangeRates', 'rates'),
        sanitizeForFirestore(nextRates)
      )
    );
    setExchangeRates(nextRates);
  };

  return (
    <TradingContext.Provider
      value={{
        workspaceId,
        switchWorkspace,

        accounts,
        selectedAccountId,
        setSelectedAccountId,
        activeAccount,
        addAccount,
        updateAccount,
        updateAccountBalance,
        deleteAccount,

        trades,
        filteredTrades,
        addTrade,
        closeTrade,
        updateTrade,
        deleteTrade,

        selectedTradeId,
        setSelectedTradeId,
        selectedTrade,

        journalEntries,
        addJournalEntry,
        deleteJournalEntry,

        rules,
        addRule,
        toggleRule,
        deleteRule,

        instrumentSpecs,
        saveInstrumentSpec,
        deleteInstrumentSpec,
        exchangeRates,
        saveExchangeRate,
        deleteExchangeRate,
        specModalSymbol,
        setSpecModalSymbol,

        activeTab,
        setActiveTab,

        selectedCalendarDate,
        setSelectedCalendarDate,

        isAccountModalOpen,
        setIsAccountModalOpen,
        isAddTradeModalOpen,
        setIsAddTradeModalOpen,
        journalViewMode,
        setJournalViewMode,

        firestoreStatus
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) throw new Error('useTrading must be used within TradingProvider');
  return context;
};
