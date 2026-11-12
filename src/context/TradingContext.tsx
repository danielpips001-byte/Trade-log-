import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Account, Trade, JournalEntry, TradingRule, ActiveTab, CloseOutcome } from '../types/trading';
import { INITIAL_ACCOUNTS, INITIAL_TRADES, INITIAL_JOURNAL, INITIAL_RULES } from '../data/mockData';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';

interface TradingContextType {
  accounts: Account[];
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
  activeAccount: Account | undefined;
  addAccount: (account: { name: string; type: Account['type']; broker?: string; startingBalance: number; currency: Account['currency'] }) => Promise<void>;
  updateAccountBalance: (accountId: string, newBalance: number) => Promise<void>;

  trades: Trade[];
  filteredTrades: Trade[];
  addTrade: (trade: Omit<Trade, 'id' | 'status' | 'realizedPnl'> & { realizedPnl?: number; status?: 'Open' | 'Closed' }) => Promise<Trade>;
  closeTrade: (tradeId: string, closeData: {
    outcome: CloseOutcome;
    exitPrice: number;
    realizedPnl: number;
    closedDate: string;
    closedAt: string;
    notes?: string;
  }) => Promise<void>;
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

  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  selectedCalendarDate: string;
  setSelectedCalendarDate: (date: string) => void;

  firestoreStatus: 'connected' | 'syncing' | 'offline';
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('tradelog_glass_accounts_v3');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    const saved = localStorage.getItem('tradelog_glass_selected_acc_v3');
    return saved || 'acc-ftmo';
  });

  const [trades, setTrades] = useState<Trade[]>(() => {
    const saved = localStorage.getItem('tradelog_glass_trades_v3');
    return saved ? JSON.parse(saved) : INITIAL_TRADES;
  });

  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem('tradelog_glass_journal_v3');
    return saved ? JSON.parse(saved) : INITIAL_JOURNAL;
  });

  const [rules, setRules] = useState<TradingRule[]>(() => {
    const saved = localStorage.getItem('tradelog_glass_rules_v3');
    return saved ? JSON.parse(saved) : INITIAL_RULES;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('calendar');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('2026-11-11');
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');

  const hasSeededTradesRef = useRef(false);

  // Persistence to LocalStorage
  useEffect(() => {
    localStorage.setItem('tradelog_glass_accounts_v3', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('tradelog_glass_selected_acc_v3', selectedAccountId);
  }, [selectedAccountId]);

  useEffect(() => {
    localStorage.setItem('tradelog_glass_trades_v3', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem('tradelog_glass_journal_v3', JSON.stringify(journalEntries));
  }, [journalEntries]);

  useEffect(() => {
    localStorage.setItem('tradelog_glass_rules_v3', JSON.stringify(rules));
  }, [rules]);

  // Real-time Firestore sync for trades
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const tradesRef = collection(db, 'trades');
      unsubscribe = onSnapshot(tradesRef, async (snapshot) => {
        setFirestoreStatus('connected');
        if (!snapshot.empty) {
          const firestoreTrades: Trade[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            // Ignore test probes
            if (docSnap.id === 'test-probe') return;
            firestoreTrades.push({
              id: docSnap.id,
              ...data
            } as Trade);
          });

          if (firestoreTrades.length > 0) {
            setTrades(firestoreTrades);
          }
        } else if (!hasSeededTradesRef.current) {
          // Seed initial trades to Firestore so the user's database is initialized
          hasSeededTradesRef.current = true;
          for (const initTrade of INITIAL_TRADES) {
            const clean = sanitizeForFirestore(initTrade);
            await setDoc(doc(db, 'trades', initTrade.id), clean).catch(() => {});
          }
        }
      }, (err) => {
        console.warn('Firestore onSnapshot notice:', err.message);
        setFirestoreStatus('offline');
      });
    } catch (e) {
      console.warn('Firestore connection failed:', e);
      setFirestoreStatus('offline');
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Filtered trades by account
  const filteredTrades = selectedAccountId === 'all'
    ? trades
    : trades.filter(t => t.accountId === selectedAccountId);

  const activeAccount = accounts.find(a => a.id === selectedAccountId);
  const selectedTrade = trades.find(t => t.id === selectedTradeId);

  // Account actions
  const addAccount = async (data: { name: string; type: Account['type']; broker?: string; startingBalance: number; currency: Account['currency'] }) => {
    const newAcc: Account = {
      ...data,
      id: `acc-${Date.now()}`,
      currentBalance: data.startingBalance,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setAccounts(prev => [...prev, newAcc]);
    setSelectedAccountId(newAcc.id);

    try {
      await setDoc(doc(db, 'accounts', newAcc.id), sanitizeForFirestore(newAcc));
    } catch (err) {
      console.warn('Firestore setDoc accounts error:', err);
    }
  };

  const updateAccountBalance = async (accountId: string, newBalance: number) => {
    const cleanBal = Number(newBalance.toFixed(2));
    setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, currentBalance: cleanBal } : a));

    try {
      await updateDoc(doc(db, 'accounts', accountId), { currentBalance: cleanBal });
    } catch {
      try {
        const target = accounts.find(a => a.id === accountId);
        if (target) {
          await setDoc(doc(db, 'accounts', accountId), sanitizeForFirestore({ ...target, currentBalance: cleanBal }));
        }
      } catch (err) {
        console.warn('Error updating account balance in Firestore:', err);
      }
    }
  };

  /**
   * ADD TRADE - Highest Priority Requirement
   * Validates required data, persists to Firestore, and sets status to 'Open'.
   * Throws on Firestore failure so the UI can report real errors.
   */
  const addTrade = async (tradeData: Omit<Trade, 'id' | 'status' | 'realizedPnl'> & { realizedPnl?: number; status?: 'Open' | 'Closed' }): Promise<Trade> => {
    // 1. Rigorous Data Validation
    if (!tradeData.asset || !tradeData.asset.trim()) {
      throw new Error('Please enter an instrument symbol (e.g. XAUUSD, XAGUSD, US30).');
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

    // 2. Build Trade Document with guaranteed OPEN status and 0 realized PnL
    const newTradeId = `t-${Date.now()}`;
    const newTrade: Trade = {
      ...tradeData,
      id: newTradeId,
      asset: tradeData.asset.toUpperCase().trim(),
      status: 'Open',
      realizedPnl: 0,
      date: tradeData.date || new Date().toISOString().split('T')[0],
      time: tradeData.time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    };

    // 3. Sanitize for Firestore to strip undefined fields
    const cleanPayload = sanitizeForFirestore(newTrade);

    // 4. Save to Firestore first and await confirmation
    try {
      await setDoc(doc(db, 'trades', newTradeId), cleanPayload);
    } catch (firestoreError: any) {
      console.error('Firestore save failed:', firestoreError);
      throw new Error(
        firestoreError?.message || 'Failed to save trade to Firebase. Please check your connection and try again.'
      );
    }

    // 5. Update local state and persistence
    setTrades(prev => [newTrade, ...prev]);

    return newTrade;
  };

  // Close Trade Action: Updates status to 'Closed', applies realized profit to account balance
  const closeTrade = async (
    tradeId: string, 
    closeData: {
      outcome: CloseOutcome;
      exitPrice: number;
      realizedPnl: number;
      closedDate: string;
      closedAt: string;
      notes?: string;
    }
  ) => {
    const target = trades.find(t => t.id === tradeId);
    if (!target) return;

    // Only update balance if trade was previously Open
    if (target.status === 'Open') {
      const targetAccount = accounts.find(a => a.id === target.accountId);
      const newBal = Number(((targetAccount?.currentBalance || 100000) + closeData.realizedPnl).toFixed(2));
      
      setAccounts(prev => prev.map(acc => {
        if (acc.id === target.accountId) {
          return {
            ...acc,
            currentBalance: newBal
          };
        }
        return acc;
      }));

      // Persist account balance to Firestore
      try {
        await updateDoc(doc(db, 'accounts', target.accountId), { currentBalance: newBal });
      } catch (err) {
        console.warn('Account update in Firestore failed:', err);
      }
    }

    const updated: Trade = {
      ...target,
      status: 'Closed',
      closeOutcome: closeData.outcome,
      exitPrice: closeData.exitPrice,
      realizedPnl: closeData.realizedPnl,
      closedDate: closeData.closedDate,
      closedAt: closeData.closedAt,
      notes: closeData.notes 
        ? (target.notes ? `${target.notes}\n\n[Closed]: ${closeData.notes}` : closeData.notes) 
        : target.notes
    };

    setTrades(prev => prev.map(t => t.id === tradeId ? updated : t));

    try {
      await setDoc(doc(db, 'trades', tradeId), sanitizeForFirestore(updated));
    } catch (e) {
      console.warn('Firestore closeTrade error:', e);
    }
  };

  // Update Trade: Handles edits to closed or open trades safely without double-counting
  const updateTrade = async (updated: Trade) => {
    const oldTrade = trades.find(t => t.id === updated.id);
    
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

    setTrades(prev => prev.map(t => t.id === updated.id ? updated : t));

    if (pnlDelta !== 0) {
      setAccounts(prev => prev.map(acc => {
        if (acc.id === updated.accountId) {
          const updatedBal = Number((acc.currentBalance + pnlDelta).toFixed(2));
          updateDoc(doc(db, 'accounts', acc.id), { currentBalance: updatedBal }).catch(() => {});
          return {
            ...acc,
            currentBalance: updatedBal
          };
        }
        return acc;
      }));
    }

    try {
      await setDoc(doc(db, 'trades', updated.id), sanitizeForFirestore(updated));
    } catch (err) {
      console.warn('Firestore update warning:', err);
    }
  };

  // Delete trade
  const deleteTrade = async (tradeId: string) => {
    const target = trades.find(t => t.id === tradeId);
    if (target && target.status === 'Closed' && target.realizedPnl) {
      setAccounts(prev => prev.map(acc => {
        if (acc.id === target.accountId) {
          const updatedBal = Number((acc.currentBalance - target.realizedPnl).toFixed(2));
          updateDoc(doc(db, 'accounts', acc.id), { currentBalance: updatedBal }).catch(() => {});
          return {
            ...acc,
            currentBalance: updatedBal
          };
        }
        return acc;
      }));
    }

    setTrades(prev => prev.filter(t => t.id !== tradeId));
    if (selectedTradeId === tradeId) setSelectedTradeId(null);

    try {
      await deleteDoc(doc(db, 'trades', tradeId));
    } catch (err) {
      console.warn('Firestore delete warning:', err);
    }
  };

  // Journal management
  const addJournalEntry = async (entry: Omit<JournalEntry, 'id'>): Promise<JournalEntry> => {
    const newEntry: JournalEntry = {
      ...entry,
      id: `j-${Date.now()}`
    };
    setJournalEntries(prev => [newEntry, ...prev]);

    try {
      await setDoc(doc(db, 'journal', newEntry.id), sanitizeForFirestore(newEntry));
    } catch (err) {
      console.warn('Firestore journal entry save warning:', err);
    }
    return newEntry;
  };

  const deleteJournalEntry = async (id: string) => {
    setJournalEntries(prev => prev.filter(j => j.id !== id));
    try {
      await deleteDoc(doc(db, 'journal', id));
    } catch (err) {
      console.warn('Firestore journal delete warning:', err);
    }
  };

  // Rules management
  const addRule = async (text: string): Promise<TradingRule> => {
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('Please enter a rule description.');
    }
    const newRule: TradingRule = {
      id: `r-${Date.now()}`,
      text: cleanText,
      isActive: true
    };
    setRules(prev => [...prev, newRule]);

    try {
      await setDoc(doc(db, 'rules', newRule.id), sanitizeForFirestore(newRule));
    } catch (err) {
      console.warn('Firestore rule save warning:', err);
    }
    return newRule;
  };

  const toggleRule = async (id: string) => {
    const target = rules.find(r => r.id === id);
    if (!target) return;
    const updated = { ...target, isActive: !target.isActive };
    setRules(prev => prev.map(r => r.id === id ? updated : r));

    try {
      await setDoc(doc(db, 'rules', id), sanitizeForFirestore(updated));
    } catch (err) {
      console.warn('Firestore toggle rule warning:', err);
    }
  };

  const deleteRule = async (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    try {
      await deleteDoc(doc(db, 'rules', id));
    } catch (err) {
      console.warn('Firestore delete rule warning:', err);
    }
  };

  return (
    <TradingContext.Provider
      value={{
        accounts,
        selectedAccountId,
        setSelectedAccountId,
        activeAccount,
        addAccount,
        updateAccountBalance,

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

        activeTab,
        setActiveTab,

        selectedCalendarDate,
        setSelectedCalendarDate,
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
