import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, Transaction, BankCard, Category, TagItem, DueReminder } from './types';
import { INITIAL_STATE } from './data/initialData';
import { CircularIcon, IconName } from './components/CircularIcon';
import { HomeView } from './components/HomeView';
import { CardsView } from './components/CardsView';
import { StatsView } from './components/StatsView';
import { ArchiveView } from './components/ArchiveView';
import { SettingsView } from './components/SettingsView';
import { TransactionModal } from './components/TransactionModal';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';
import { toEnglishDigits } from './utils/persian';
import {
  detectGitHubPagesRepo,
  consumePartnerMagicLinkFromHash,
  pushStateToGitHubDirect,
  pullStateFromGitHubDirect,
} from './utils/githubSync';

const STORAGE_KEY = 'hamhesab_hootan_fatemeh_v2';

interface NavTab {
  id: string;
  label: string;
  icon: IconName;
  color: string;
}

const TABS: NavTab[] = [
  { id: 'home', label: 'خانه', icon: 'wallet', color: '#10b981' },
  { id: 'cards', label: 'کارت‌ها', icon: 'credit-card', color: '#0ea5e9' },
  { id: 'stats', label: 'آمارها', icon: 'pie-chart', color: '#8b5cf6' },
  { id: 'archive', label: 'آرشیو', icon: 'archive', color: '#f59e0b' },
  { id: 'settings', label: 'تنظیمات', icon: 'settings', color: '#ec4899' },
];

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const autoRepo = detectGitHubPagesRepo();
    const magicLinkConfig = consumePartnerMagicLinkFromHash();

    try {
      const saved =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem('hamhesab_hootan_fatemeh_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        const existingSync = parsed.settings?.githubSync || {};
        return {
          ...INITIAL_STATE,
          ...parsed,
          budgets: parsed.budgets?.length ? parsed.budgets : INITIAL_STATE.budgets,
          reminders: parsed.reminders?.length ? parsed.reminders : INITIAL_STATE.reminders,
          settings: {
            ...INITIAL_STATE.settings,
            ...(parsed.settings || {}),
            githubSync: {
              ...INITIAL_STATE.settings.githubSync,
              ...existingSync,
              repoOwner:
                magicLinkConfig?.repoOwner ||
                existingSync.repoOwner ||
                autoRepo.repoOwner ||
                '',
              repoName:
                magicLinkConfig?.repoName ||
                existingSync.repoName ||
                autoRepo.repoName ||
                '',
              token: magicLinkConfig?.token || existingSync.token || '',
            },
          },
        };
      }
    } catch {
      // ignore storage errors
    }

    return {
      ...INITIAL_STATE,
      settings: {
        ...INITIAL_STATE.settings,
        githubSync: {
          ...INITIAL_STATE.settings.githubSync!,
          repoOwner: magicLinkConfig?.repoOwner || autoRepo.repoOwner || '',
          repoName: magicLinkConfig?.repoName || autoRepo.repoName || '',
          token: magicLinkConfig?.token || '',
        },
      },
    };
  });

  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);
  const [swipeDirection, setSwipeDirection] = useState<number>(0);
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string>('');

  // PIN Lock State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => !state.settings.pinCode);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);

  // Touch Swipe Refs
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isApplyingRemoteRef = useRef<boolean>(false);

  // 1. Default LocalStorage Persistence
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  // 2. Push to GitHub Directly (for GitHub Pages) AND/OR Server API automatically
  const pushStateToRemote = useCallback(
    async (currentState: AppState): Promise<{ ok: boolean; error?: string }> => {
      setSyncStatus('syncing');
      setSyncErrorMessage('');

      // A) Direct Browser-to-GitHub API sync (works on GitHub Pages without any backend!)
      const hasGitHubToken = Boolean(currentState.settings.githubSync?.token?.trim());
      if (hasGitHubToken) {
        const ghResult = await pushStateToGitHubDirect(currentState);
        if (ghResult.ok) {
          setSyncStatus('synced');
          return { ok: true };
        } else if (ghResult.error && ghResult.error !== 'missing_credentials') {
          setSyncStatus('error');
          setSyncErrorMessage(ghResult.error);
          return { ok: false, error: ghResult.error };
        }
      }

      // B) Fallback/parallel push to backend server (/api/sync) when running on Cloud Run / Node server
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: currentState }),
        });
        if (res.ok) {
          setSyncStatus('synced');
          return { ok: true };
        }
      } catch {
        // Static GitHub Pages has no /api/sync
      }

      setSyncStatus('idle');
      return { ok: false };
    },
    []
  );

  // 3. Pull latest state from GitHub Repository Directly (Zero-token experience for Fatemeh!) or Server
  const pullStateFromRemote = useCallback(async () => {
    try {
      // A) First try pulling directly from GitHub Repo (works on GitHub Pages!)
      const ghPull = await pullStateFromGitHubDirect(state);
      if (ghPull.ok && ghPull.remoteState) {
        const remoteData = ghPull.remoteState;
        setState((prev) => {
          const remoteUpdated = remoteData.updatedAt || 0;
          const localUpdated = prev.updatedAt || 0;
          const autoRepo = detectGitHubPagesRepo();
          const bestToken =
            prev.settings.githubSync?.token?.trim() || ghPull.recoveredToken || '';

          // Even if timestamps are equal, if Fatemeh's phone didn't have the token yet and we recovered it from syncVault, save it!
          if (remoteUpdated > localUpdated) {
            isApplyingRemoteRef.current = true;
            return {
              ...prev,
              ...remoteData,
              settings: {
                ...prev.settings,
                ...(remoteData.settings || {}),
                githubSync: {
                  ...INITIAL_STATE.settings.githubSync!,
                  ...(prev.settings.githubSync || {}),
                  ...(remoteData.settings?.githubSync || {}),
                  enabled: true,
                  repoOwner:
                    prev.settings.githubSync?.repoOwner ||
                    remoteData.settings?.githubSync?.repoOwner ||
                    autoRepo.repoOwner ||
                    '',
                  repoName:
                    prev.settings.githubSync?.repoName ||
                    remoteData.settings?.githubSync?.repoName ||
                    autoRepo.repoName ||
                    '',
                  token: bestToken,
                },
              },
            };
          } else if (!prev.settings.githubSync?.token && bestToken) {
            isApplyingRemoteRef.current = true;
            return {
              ...prev,
              settings: {
                ...prev.settings,
                githubSync: {
                  ...prev.settings.githubSync!,
                  repoOwner:
                    prev.settings.githubSync?.repoOwner || autoRepo.repoOwner || '',
                  repoName:
                    prev.settings.githubSync?.repoName || autoRepo.repoName || '',
                  token: bestToken,
                },
              },
            };
          }
          return prev;
        });
        setSyncStatus('synced');
        return;
      }

      // B) Try /api/sync if running on Cloud Run server
      const res = await fetch('/api/sync');
      if (res.ok) {
        const data = await res.json();
        if (data?.status === 'ok' && data.state) {
          setState((prev) => {
            const remoteUpdated = data.state.updatedAt || 0;
            const localUpdated = prev.updatedAt || 0;
            if (remoteUpdated > localUpdated) {
              isApplyingRemoteRef.current = true;
              return {
                ...prev,
                ...data.state,
                settings: {
                  ...prev.settings,
                  ...(data.state.settings || {}),
                  githubSync: {
                    ...prev.settings.githubSync,
                    ...(data.state.settings?.githubSync || {}),
                    token: prev.settings.githubSync?.token || '',
                  },
                },
              };
            }
            return prev;
          });
          setSyncStatus('synced');
          return;
        }
      }
    } catch {
      // Offline mode continues using LocalStorage seamlessly
    }
  }, [state]);

  useEffect(() => {
    pullStateFromRemote();
    const interval = setInterval(pullStateFromRemote, 15000);
    return () => clearInterval(interval);
  }, [pullStateFromRemote]);

  // Debounced auto-push when local state changes
  useEffect(() => {
    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      pushStateToRemote(state);
    }, 800);
    return () => clearTimeout(timer);
  }, [state, pushStateToRemote]);

  // Sync Dark Mode (Manual or Auto/System Phone Theme) & Color Theme on <html>
  useEffect(() => {
    const root = document.documentElement;
    const mode = state.settings.themeMode || (state.settings.darkMode ? 'dark' : 'light');
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyDarkClass = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (mode === 'system') {
      applyDarkClass(mediaQuery.matches);
      if (state.settings.darkMode !== mediaQuery.matches) {
        setState((prev) => ({
          ...prev,
          settings: { ...prev.settings, darkMode: mediaQuery.matches },
        }));
      }
      const handleSystemChange = (e: MediaQueryListEvent) => {
        applyDarkClass(e.matches);
        setState((prev) => ({
          ...prev,
          settings: { ...prev.settings, darkMode: e.matches },
        }));
      };
      mediaQuery.addEventListener('change', handleSystemChange);
      root.setAttribute('data-color-theme', state.settings.colorTheme || 'emerald');
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    } else {
      const isDark = mode === 'dark';
      applyDarkClass(isDark);
      root.setAttribute('data-color-theme', state.settings.colorTheme || 'emerald');
    }
  }, [state.settings.themeMode, state.settings.darkMode, state.settings.colorTheme]);

  const handleTabChange = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= TABS.length || newIndex === activeTabIndex) return;
    setSwipeDirection(newIndex > activeTabIndex ? 1 : -1);
    setActiveTabIndex(newIndex);
  };

  // Touch Gesture Handlers for left/right swipe between tabs
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTxModalOpen) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (
      isTxModalOpen ||
      touchStartX.current === null ||
      touchStartY.current === null
    ) {
      return;
    }
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > 65 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (deltaX > 0) {
        if (activeTabIndex < TABS.length - 1) {
          handleTabChange(activeTabIndex + 1);
        }
      } else {
        if (activeTabIndex > 0) {
          handleTabChange(activeTabIndex - 1);
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // CRUD Handlers (all stamp updatedAt: Date.now() for automatic sync resolution)
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    setState((prev) => {
      if (existingId) {
        return {
          ...prev,
          updatedAt: Date.now(),
          transactions: prev.transactions.map((t) =>
            t.id === existingId ? { ...t, ...txData } : t
          ),
        };
      }
      const newTx: Transaction = {
        ...txData,
        id: `tx_${Date.now()}`,
        createdAt: Date.now(),
      };
      return {
        ...prev,
        updatedAt: Date.now(),
        transactions: [newTx, ...prev.transactions],
      };
    });
  };

  const handleDeleteTransaction = (id: string) => {
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  };

  const handleSaveCard = (cardData: Omit<BankCard, 'id'>, existingId?: string) => {
    setState((prev) => {
      if (existingId) {
        return {
          ...prev,
          updatedAt: Date.now(),
          cards: prev.cards.map((c) =>
            c.id === existingId ? { ...c, ...cardData } : c
          ),
        };
      }
      const newCard: BankCard = {
        ...cardData,
        id: `card_${Date.now()}`,
      };
      return {
        ...prev,
        updatedAt: Date.now(),
        cards: [...prev.cards, newCard],
      };
    });
  };

  const handleDeleteCard = (id: string) => {
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      cards: prev.cards.filter((c) => c.id !== id),
    }));
  };

  const handleSaveCategory = (cat: Category) => {
    setState((prev) => {
      const exists = prev.categories.some((c) => c.id === cat.id);
      return {
        ...prev,
        updatedAt: Date.now(),
        categories: exists
          ? prev.categories.map((c) => (c.id === cat.id ? cat : c))
          : [...prev.categories, cat],
      };
    });
  };

  const handleDeleteCategory = (catId: string) => {
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      categories: prev.categories.filter((c) => c.id !== catId),
    }));
  };

  const handleSaveTag = (tag: TagItem) => {
    setState((prev) => {
      const exists = prev.tags.some((t) => t.id === tag.id);
      return {
        ...prev,
        updatedAt: Date.now(),
        tags: exists
          ? prev.tags.map((t) => (t.id === tag.id ? tag : t))
          : [...prev.tags, tag],
      };
    });
  };

  const handleDeleteTag = (tagId: string) => {
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      tags: prev.tags.filter((t) => t.id !== tagId),
    }));
  };

  const handleUpdateBudget = (categoryId: string, monthlyLimit: number) => {
    setState((prev) => {
      const exists = prev.budgets.some((b) => b.categoryId === categoryId);
      const updatedBudgets = exists
        ? prev.budgets.map((b) =>
            b.categoryId === categoryId ? { ...b, monthlyLimit } : b
          )
        : [
            ...prev.budgets,
            { id: `b_${Date.now()}`, categoryId, monthlyLimit },
          ];
      return {
        ...prev,
        updatedAt: Date.now(),
        budgets: updatedBudgets,
      };
    });
  };

  const handleUpdateSettings = (partial: Partial<AppState['settings']>) => {
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      settings: { ...prev.settings, ...partial },
    }));
  };

  const handleAddReminder = (rem: Omit<DueReminder, 'id'>) => {
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      reminders: [
        { ...rem, id: `rem_${Date.now()}` },
        ...(prev.reminders || []),
      ],
    }));
  };

  const handleToggleReminderPaid = (id: string) => {
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      reminders: (prev.reminders || []).map((r) =>
        r.id === id ? { ...r, isPaid: !r.isPaid } : r
      ),
    }));
  };

  const handleDeleteReminder = (id: string) => {
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      reminders: (prev.reminders || []).filter((r) => r.id !== id),
    }));
  };

  const handleManualSyncNow = async () => {
    await pushStateToRemote(state);
    await pullStateFromRemote();
  };

  // Optional Private PIN Lock Screen
  if (!isUnlocked && state.settings.pinCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center space-y-5 shadow-2xl">
          <div className="flex justify-center">
            <CircularIcon name="lock" size="xl" color="#10b981" variant="solid" />
          </div>
          <div>
            <h1 className="text-lg font-black">
              حساب خصوصی {state.settings.hootanName} و {state.settings.fatemehName}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              لطفاً رمز ۴ رقمی ورود را وارد کنید
            </p>
          </div>
          <input
            type="password"
            dir="ltr"
            maxLength={4}
            inputMode="numeric"
            value={pinInput}
            onChange={(e) => {
              const val = toEnglishDigits(e.target.value).replace(/\D/g, '');
              setPinInput(val);
              setPinError(false);
              if (val === state.settings.pinCode) {
                setIsUnlocked(true);
              } else if (val.length === 4) {
                setPinError(true);
              }
            }}
            placeholder="••••"
            className="w-40 mx-auto block px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-center text-2xl tracking-widest font-mono"
          />
          {pinError && (
            <p className="text-xs text-rose-400 font-bold">رمز وارد شده اشتباه است</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-24 transition-colors duration-200"
    >
      {/* Top Bar Contract: 3 Clean Zones */}
      <header className="monochrome-scope sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title (Single text element wordmark) */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange(0);
            }}
            className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            هم‌حساب · {state.settings.hootanName} و {state.settings.fatemehName}
          </a>

          {/* Zone 2: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-400">
            {TABS.map((tab, idx) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(idx)}
                className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
                  activeTabIndex === idx
                    ? 'theme-text font-extrabold underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Install App / APK + Primary Action CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton
              repoOwner={state.settings.githubSync?.repoOwner}
              repoName={state.settings.githubSync?.repoName}
              variant="header"
            />
            <button
              type="button"
              onClick={() => {
                setEditingTx(null);
                setIsTxModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl theme-gradient text-white text-xs font-extrabold shadow-sm hover:opacity-95 active:scale-95 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              + ثبت تراکنش
            </button>
          </div>
        </div>
      </header>

      <OfflineIndicator />

      {/* Main Content Area with Swipe Gesture Support */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={TABS[activeTabIndex].id}
            initial={{ opacity: 0, x: swipeDirection >= 0 ? -24 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: swipeDirection >= 0 ? 24 : -24 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={activeTabIndex !== 4 ? 'monochrome-scope' : ''}
          >
            {activeTabIndex === 0 && (
              <HomeView
                state={state}
                onAddTransaction={() => {
                  setEditingTx(null);
                  setIsTxModalOpen(true);
                }}
                onEditTransaction={(tx) => {
                  setEditingTx(tx);
                  setIsTxModalOpen(true);
                }}
                onDeleteTransaction={handleDeleteTransaction}
                onNavigateTab={handleTabChange}
                onAddReminder={handleAddReminder}
                onToggleReminderPaid={handleToggleReminderPaid}
                onDeleteReminder={handleDeleteReminder}
              />
            )}

            {activeTabIndex === 1 && (
              <CardsView
                state={state}
                onSaveCard={handleSaveCard}
                onDeleteCard={handleDeleteCard}
              />
            )}

            {activeTabIndex === 2 && (
              <StatsView
                state={state}
                onNavigateSettingsBudgets={() => handleTabChange(4)}
              />
            )}

            {activeTabIndex === 3 && (
              <ArchiveView
                state={state}
                onEditTransaction={(tx) => {
                  setEditingTx(tx);
                  setIsTxModalOpen(true);
                }}
              />
            )}

            {activeTabIndex === 4 && (
              <SettingsView
                state={state}
                onUpdateSettings={handleUpdateSettings}
                onUpdateBudget={handleUpdateBudget}
                onSaveCategory={handleSaveCategory}
                onDeleteCategory={handleDeleteCategory}
                onSaveTag={handleSaveTag}
                onDeleteTag={handleDeleteTag}
                onImportState={(newState) =>
                  setState({ ...newState, updatedAt: Date.now() })
                }
                onResetDefaults={() =>
                  setState({ ...INITIAL_STATE, updatedAt: Date.now() })
                }
                onManualSyncNow={handleManualSyncNow}
                onLockAppNow={() => setIsUnlocked(false)}
                syncStatus={syncStatus}
                syncErrorMessage={syncErrorMessage}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar: Icon-Only until selected, then expands to show its name */}
      <div className="monochrome-scope fixed bottom-4 left-0 right-0 z-40 px-4 pointer-events-none">
        <nav
          aria-label="منوی اصلی پایین"
          className="max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-full p-1.5 shadow-2xl flex items-center justify-around pointer-events-auto"
        >
          {TABS.map((tab, index) => {
            const isSelected = activeTabIndex === index;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(index)}
                aria-label={tab.label}
                className={`flex items-center justify-center gap-2 rounded-full transition-all duration-200 cursor-pointer min-h-[44px] ${
                  isSelected
                    ? 'theme-bg text-white px-4 py-1.5 shadow-md'
                    : 'px-2.5 py-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CircularIcon
                  name={tab.icon}
                  color={isSelected ? '#ffffff' : tab.color}
                  size="sm"
                  variant={isSelected ? 'glass' : 'soft'}
                />
                {isSelected && (
                  <span className="text-xs font-extrabold whitespace-nowrap">
                    {tab.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Add / Edit Transaction Modal */}
      <div className="monochrome-scope">
        <TransactionModal
          isOpen={isTxModalOpen}
          onClose={() => {
            setIsTxModalOpen(false);
            setEditingTx(null);
          }}
          state={state}
          onSave={handleSaveTransaction}
          editingTransaction={editingTx}
        />
      </div>
    </div>
  );
}
