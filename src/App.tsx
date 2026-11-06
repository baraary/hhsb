import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User, ChevronDown, Check, Plus, ShieldCheck, Lock, X } from 'lucide-react';
import {
  AppState,
  Transaction,
  BankCard,
  Category,
  TagItem,
  DueReminder,
  UserAccount,
} from './types';
import {
  DEFAULT_USERS,
  createCleanUserState,
} from './data/initialData';
import { CircularIcon, IconName } from './components/CircularIcon';
import { HomeView } from './components/HomeView';
import { CardsView } from './components/CardsView';
import { StatsView } from './components/StatsView';
import { ArchiveView } from './components/ArchiveView';
import { SettingsView } from './components/SettingsView';
import { TransactionModal } from './components/TransactionModal';
import { BankSmsModal } from './components/BankSmsModal';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';
import {
  toEnglishDigits,
  advanceJalaliDate,
  rewindJalaliDate,
  getCurrentJalaliDateStr,
} from './utils/persian';
import {
  isLikelyBankSms,
  computeSmsHash,
  NativeAndroidSmsItem,
} from './utils/bankSmsParser';
import {
  detectGitHubPagesRepo,
  consumePartnerMagicLinkFromHash,
  pushStateToGitHubDirect,
  pullStateFromGitHubDirect,
} from './utils/githubSync';

const USERS_REGISTRY_KEY = 'hamhesab_users_registry_v3';
const ACTIVE_USER_KEY = 'hamhesab_active_user_id_v3';
const getUserStorageKey = (userId: string) => `hamhesab_isolated_user_v3_${userId}`;

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

const AVATAR_PALETTE = [
  '#10b981',
  '#f43f5e',
  '#0ea5e9',
  '#8b5cf6',
  '#f59e0b',
  '#06b6d4',
];

function loadIsolatedUserState(user: UserAccount): AppState {
  const autoRepo = detectGitHubPagesRepo();
  const magicLinkConfig = consumePartnerMagicLinkFromHash();
  const userFilePath = `data/users/${user.id}-db.json`;

  let recoveredOldToken = '';
  try {
    const oldRaw = localStorage.getItem('hamhesab_hootan_fatemeh_v2');
    if (oldRaw) {
      const oldParsed = JSON.parse(oldRaw);
      recoveredOldToken = oldParsed?.settings?.githubSync?.token || '';
    }
  } catch {
    // ignore
  }

  try {
    const saved = localStorage.getItem(getUserStorageKey(user.id));
    if (saved) {
      const parsed = JSON.parse(saved);
      const existingSync = parsed.settings?.githubSync || {};
      const baseClean = createCleanUserState(
        user.id,
        user.name,
        user.id === 'fatemeh' ? 'rose' : 'emerald',
        autoRepo.repoOwner,
        autoRepo.repoName,
        recoveredOldToken
      );
      return {
        ...baseClean,
        ...parsed,
        userId: user.id,
        settings: {
          ...baseClean.settings,
          ...(parsed.settings || {}),
          userName: parsed.settings?.userName || user.name,
          pinCode: parsed.settings?.pinCode || user.pinCode || '',
          githubSync: {
            ...baseClean.settings.githubSync!,
            ...existingSync,
            filePath: userFilePath,
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
            token:
              magicLinkConfig?.token ||
              existingSync.token ||
              recoveredOldToken ||
              '',
          },
        },
      };
    }
  } catch {
    // ignore
  }

  const fresh = createCleanUserState(
    user.id,
    user.name,
    user.id === 'fatemeh' ? 'rose' : 'emerald',
    magicLinkConfig?.repoOwner || autoRepo.repoOwner || '',
    magicLinkConfig?.repoName || autoRepo.repoName || '',
    magicLinkConfig?.token || recoveredOldToken || ''
  );
  if (user.pinCode) {
    fresh.settings.pinCode = user.pinCode;
  }
  return fresh;
}

/**
 * Checks if a touch event target lies inside a horizontally scrollable container
 * or an element explicitly marked with `data-no-swipe="true"`.
 */
function shouldIgnoreTabSwipe(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  let el: HTMLElement | null = target;
  while (el && el !== document.body) {
    if (el.getAttribute('data-no-swipe') === 'true') {
      return true;
    }
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      return true;
    }
    if (el.scrollWidth > el.clientWidth + 2) {
      const style = window.getComputedStyle(el);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
        return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

export default function App() {
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const raw = localStorage.getItem(USERS_REGISTRY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_USERS;
  });

  const [activeUserId, setActiveUserId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(ACTIVE_USER_KEY);
      if (savedId) return savedId;
    } catch {
      // ignore
    }
    return 'hootan';
  });

  const activeUserObj =
    users.find((u) => u.id === activeUserId) || users[0] || DEFAULT_USERS[0];

  const [state, setState] = useState<AppState>(() =>
    loadIsolatedUserState(activeUserObj)
  );

  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const [quickNewUserName, setQuickNewUserName] = useState('');
  const [quickNewUserPin, setQuickNewUserPin] = useState('');
  const [userCreatedToast, setUserCreatedToast] = useState('');

  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);
  const [swipeDirection, setSwipeDirection] = useState<number>(0);
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isBankSmsModalOpen, setIsBankSmsModalOpen] = useState<boolean>(false);
  const [initialBankSmsText, setInitialBankSmsText] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string>('');

  // Per-User PIN Lock State (Unlocked within current session once verified)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(true);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);

  // Mandatory First-Time PIN Setup State (if current account has no PIN yet)
  const [firstTimePinDraft, setFirstTimePinDraft] = useState<string>('');
  const [firstTimePinError, setFirstTimePinError] = useState<string>('');

  // Pre-Switch Account Verification Modal State (Requires target user's 4-digit PIN BEFORE switching!)
  const [switchTargetUserId, setSwitchTargetUserId] = useState<string | null>(null);
  const [switchPinInput, setSwitchPinInput] = useState<string>('');
  const [switchPinError, setSwitchPinError] = useState<string>('');
  const [isCheckingRemotePin, setIsCheckingRemotePin] = useState<boolean>(false);
  const [remoteTargetPin, setRemoteTargetPin] = useState<string | null>(null);

  // Touch Swipe Refs
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isApplyingRemoteRef = useRef<boolean>(false);
  const hasUserEditedRef = useRef<boolean>(false);

  const isAdminHootan = activeUserId === 'hootan';

  // Keep user registry pinCode synced with active user's settings.pinCode
  useEffect(() => {
    if (state.settings.pinCode) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === activeUserId && u.pinCode !== state.settings.pinCode
            ? { ...u, pinCode: state.settings.pinCode }
            : u
        )
      );
    }
  }, [state.settings.pinCode, activeUserId]);

  // Save users registry & activeUserId
  useEffect(() => {
    try {
      localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));
    } catch {
      // ignore
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_USER_KEY, activeUserId);
    } catch {
      // ignore
    }
  }, [activeUserId]);

  // Save current user's isolated state to their dedicated LocalStorage key
  useEffect(() => {
    try {
      localStorage.setItem(
        getUserStorageKey(activeUserId),
        JSON.stringify(state)
      );
    } catch {
      // ignore
    }
  }, [state, activeUserId]);

  // Helper to resolve a user's stored PIN from registry or localStorage
  const getStoredUserPin = useCallback(
    (userId: string): string => {
      const regUser = users.find((u) => u.id === userId);
      if (regUser?.pinCode) return regUser.pinCode;
      try {
        const raw = localStorage.getItem(getUserStorageKey(userId));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.settings?.pinCode) return parsed.settings.pinCode;
        }
      } catch {
        // ignore
      }
      return '';
    },
    [users]
  );

  // Request switching to another user account — ALWAYS opens the PIN verification modal first!
  const handleRequestSwitchUser = useCallback(
    async (targetUserId: string) => {
      if (targetUserId === activeUserId && isUnlocked) {
        setIsUserSwitcherOpen(false);
        return;
      }
      const targetUser = users.find((u) => u.id === targetUserId);
      if (!targetUser) return;

      setSwitchTargetUserId(targetUserId);
      setSwitchPinInput('');
      setSwitchPinError('');
      setRemoteTargetPin(null);
      setIsUserSwitcherOpen(false);

      // Also check remote GitHub file for the target user so their latest PIN set on their own phone is enforced!
      setIsCheckingRemotePin(true);
      try {
        const targetLocalState = loadIsolatedUserState(targetUser);
        const queryState: AppState = {
          ...targetLocalState,
          settings: {
            ...targetLocalState.settings,
            githubSync: {
              ...targetLocalState.settings.githubSync!,
              repoOwner:
                state.settings.githubSync?.repoOwner ||
                targetLocalState.settings.githubSync?.repoOwner ||
                detectGitHubPagesRepo().repoOwner,
              repoName:
                state.settings.githubSync?.repoName ||
                targetLocalState.settings.githubSync?.repoName ||
                detectGitHubPagesRepo().repoName,
              token:
                state.settings.githubSync?.token ||
                targetLocalState.settings.githubSync?.token ||
                '',
              filePath: `data/users/${targetUser.id}-db.json`,
            },
          },
        };
        const ghPull = await pullStateFromGitHubDirect(queryState);
        if (ghPull.ok && ghPull.remoteState?.settings?.pinCode) {
          const rPin = ghPull.remoteState.settings.pinCode;
          setRemoteTargetPin(rPin);
          setUsers((prev) =>
            prev.map((u) => (u.id === targetUser.id ? { ...u, pinCode: rPin } : u))
          );
          // Cache remote state for target user in localStorage
          localStorage.setItem(
            getUserStorageKey(targetUser.id),
            JSON.stringify({
              ...targetLocalState,
              ...ghPull.remoteState,
              userId: targetUser.id,
            })
          );
        }
      } catch {
        // Offline fallback uses local PIN
      } finally {
        setIsCheckingRemotePin(false);
      }
    },
    [activeUserId, isUnlocked, users, state.settings.githubSync]
  );

  // Finalize switching user ONLY after PIN is verified
  const executeVerifiedSwitchUser = (targetUserId: string, newPinIfFirstTime?: string) => {
    const targetUser = users.find((u) => u.id === targetUserId);
    if (!targetUser) return;

    hasUserEditedRef.current = Boolean(newPinIfFirstTime);
    const loadedState = loadIsolatedUserState(targetUser);
    if (newPinIfFirstTime) {
      loadedState.settings.pinCode = newPinIfFirstTime;
      loadedState.updatedAt = Date.now();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id ? { ...u, pinCode: newPinIfFirstTime } : u
        )
      );
    }

    setActiveUserId(targetUser.id);
    setState(loadedState);
    setPinInput('');
    setPinError(false);
    setIsUnlocked(true);
    setSwitchTargetUserId(null);
    setSwitchPinInput('');
    setSwitchPinError('');
    setIsUserSwitcherOpen(false);
  };

  // Create a brand new isolated user account (Restricted strictly to Hootan - primary admin)
  const handleCreateUser = (name: string, initialPin?: string) => {
    if (activeUserId !== 'hootan') return;
    const cleanName = name.trim();
    const cleanPin = toEnglishDigits(initialPin || '').replace(/\D/g, '').slice(0, 4);
    if (!cleanName || cleanPin.length !== 4) return;

    const newId = `user_${Date.now()}`;
    const newUser: UserAccount = {
      id: newId,
      name: cleanName,
      avatarColor: AVATAR_PALETTE[users.length % AVATAR_PALETTE.length],
      createdAt: Date.now(),
      pinCode: cleanPin,
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);

    const freshState = loadIsolatedUserState(newUser);
    freshState.settings.pinCode = cleanPin;
    localStorage.setItem(getUserStorageKey(newId), JSON.stringify(freshState));

    // Keep Hootan in his own admin account and show a confirmation toast
    setUserCreatedToast(`حساب مستقل «${cleanName}» با رمز ۴ رقمی ساخته شد.`);
    setTimeout(() => setUserCreatedToast(''), 4000);
  };

  const handleDeleteUser = (userIdToDelete: string) => {
    if (activeUserId !== 'hootan') return;
    if (users.length <= 1 || userIdToDelete === 'hootan') return;
    const remaining = users.filter((u) => u.id !== userIdToDelete);
    setUsers(remaining);
    localStorage.removeItem(getUserStorageKey(userIdToDelete));
  };

  // Push current user's state to their isolated GitHub file: data/users/${activeUserId}-db.json
  const pushStateToRemote = useCallback(
    async (currentState: AppState): Promise<{ ok: boolean; error?: string }> => {
      setSyncStatus('syncing');
      setSyncErrorMessage('');

      const userFilePath = `data/users/${currentState.userId || activeUserId}-db.json`;
      const stateWithIsolatedPath: AppState = {
        ...currentState,
        settings: {
          ...currentState.settings,
          githubSync: {
            ...currentState.settings.githubSync!,
            filePath: userFilePath,
          },
        },
      };

      const hasGitHubToken = Boolean(
        stateWithIsolatedPath.settings.githubSync?.token?.trim()
      );
      if (hasGitHubToken) {
        const ghResult = await pushStateToGitHubDirect(stateWithIsolatedPath);
        if (ghResult.ok) {
          setSyncStatus('synced');
          return { ok: true };
        } else if (ghResult.error && ghResult.error !== 'missing_credentials') {
          setSyncStatus('error');
          setSyncErrorMessage(ghResult.error);
          return { ok: false, error: ghResult.error };
        }
      }

      setSyncStatus('idle');
      return { ok: false };
    },
    [activeUserId]
  );

  // Pull current user's state from their isolated GitHub file: data/users/${activeUserId}-db.json
  const pullStateFromRemote = useCallback(async () => {
    try {
      const userFilePath = `data/users/${state.userId || activeUserId}-db.json`;
      const stateToQuery: AppState = {
        ...state,
        settings: {
          ...state.settings,
          githubSync: {
            ...state.settings.githubSync!,
            filePath: userFilePath,
          },
        },
      };

      const ghPull = await pullStateFromGitHubDirect(stateToQuery);
      if (ghPull.ok && ghPull.remoteState) {
        const remoteData = ghPull.remoteState;
        if (remoteData.userId && remoteData.userId !== activeUserId) {
          return;
        }
        setState((prev) => {
          const remoteUpdated = remoteData.updatedAt || 0;
          const localUpdated = prev.updatedAt || 0;
          const autoRepo = detectGitHubPagesRepo();
          const bestToken =
            prev.settings.githubSync?.token?.trim() || ghPull.recoveredToken || '';

          if (remoteUpdated > localUpdated) {
            isApplyingRemoteRef.current = true;
            return {
              ...prev,
              ...remoteData,
              userId: activeUserId,
              settings: {
                ...prev.settings,
                ...(remoteData.settings || {}),
                pinCode: remoteData.settings?.pinCode || prev.settings.pinCode || '',
                githubSync: {
                  ...prev.settings.githubSync!,
                  ...(remoteData.settings?.githubSync || {}),
                  enabled: true,
                  filePath: userFilePath,
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
          }
          return prev;
        });
        setSyncStatus('synced');
      } else if (!state.settings.githubSync?.token?.trim()) {
        // Fallback: check legacy data/hamhesab-db.json once to recover syncVault token if needed
        const legacyQuery: AppState = {
          ...state,
          settings: {
            ...state.settings,
            githubSync: {
              ...state.settings.githubSync!,
              filePath: 'data/hamhesab-db.json',
            },
          },
        };
        const legacyPull = await pullStateFromGitHubDirect(legacyQuery);
        if (legacyPull.ok && legacyPull.recoveredToken) {
          setState((prev) => ({
            ...prev,
            settings: {
              ...prev.settings,
              githubSync: {
                ...prev.settings.githubSync!,
                token: prev.settings.githubSync?.token || legacyPull.recoveredToken || '',
              },
            },
          }));
        }
      }
    } catch {
      // Offline mode continues using LocalStorage seamlessly
    }
  }, [state, activeUserId]);

  useEffect(() => {
    pullStateFromRemote();
    const interval = setInterval(pullStateFromRemote, 15000);
    return () => clearInterval(interval);
  }, [pullStateFromRemote]);

  // Debounced auto-push ONLY when the user has actually edited local state
  useEffect(() => {
    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false;
      return;
    }
    if (!hasUserEditedRef.current) {
      return;
    }
    const timer = setTimeout(() => {
      pushStateToRemote(state);
    }, 800);
    return () => clearTimeout(timer);
  }, [state, pushStateToRemote]);

  // Listen for Native Android APK incoming Bank SMS & optional Auto-Clipboard detection
  useEffect(() => {
    window.onNativeBankSmsReceived = (smsJson: string) => {
      try {
        const item: NativeAndroidSmsItem = JSON.parse(smsJson);
        if (item?.body && isLikelyBankSms(item.body, item.address)) {
          setInitialBankSmsText(item.body);
          setIsBankSmsModalOpen(true);
        }
      } catch {
        // ignore
      }
    };
    return () => {
      window.onNativeBankSmsReceived = undefined;
    };
  }, []);

  useEffect(() => {
    if (!state.settings.autoCheckClipboardSms) return;
    const handleFocus = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && isLikelyBankSms(text)) {
          const hash = computeSmsHash(text);
          const alreadyDone =
            (state.importedSmsHashes || []).includes(hash) ||
            state.transactions.some((t) => t.smsHash === hash);
          if (!alreadyDone) {
            setInitialBankSmsText(text);
            setIsBankSmsModalOpen(true);
          }
        }
      } catch {
        // Clipboard read requires permission or user gesture on some browsers
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [state.settings.autoCheckClipboardSms, state.importedSmsHashes, state.transactions]);

  // Sync Dark Mode, Color Theme & Mobile Status Bar Theme-Color
  useEffect(() => {
    const root = document.documentElement;
    const mode =
      state.settings.themeMode || (state.settings.darkMode ? 'dark' : 'light');
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const isMono = state.settings.colorTheme === 'monochrome';

    const applyDarkClass = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        if (isMono) {
          metaTheme.setAttribute('content', isDark ? '#09090b' : '#fafafa');
        } else {
          metaTheme.setAttribute('content', isDark ? '#0f172a' : '#f8fafc');
        }
      }
    };

    root.setAttribute('data-color-theme', state.settings.colorTheme || 'emerald');

    if (mode === 'system') {
      applyDarkClass(mediaQuery.matches);
      const handleSystemChange = (e: MediaQueryListEvent) => {
        applyDarkClass(e.matches);
      };
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    } else {
      const isDark = mode === 'dark';
      applyDarkClass(isDark);
    }
  }, [state.settings.themeMode, state.settings.darkMode, state.settings.colorTheme]);

  const handleTabChange = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= TABS.length || newIndex === activeTabIndex) return;
    setSwipeDirection(newIndex > activeTabIndex ? 1 : -1);
    setActiveTabIndex(newIndex);
  };

  // Touch Gesture Handlers for left/right swipe between tabs (Respecting horizontal scroll strips!)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTxModalOpen || isBankSmsModalOpen || shouldIgnoreTabSwipe(e.target)) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (
      isTxModalOpen ||
      isBankSmsModalOpen ||
      touchStartX.current === null ||
      touchStartY.current === null
    ) {
      return;
    }
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > 75 && Math.abs(deltaX) > Math.abs(deltaY) * 1.6) {
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

  // CRUD Handlers
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    hasUserEditedRef.current = true;
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

  const handleImportBankSmsTransactions = (
    txList: Omit<Transaction, 'id' | 'createdAt'>[]
  ) => {
    if (!txList.length) return;
    hasUserEditedRef.current = true;
    setState((prev) => {
      const now = Date.now();
      const newTransactions: Transaction[] = txList.map((txData, index) => ({
        ...txData,
        id: `tx_${now}_${index}`,
        createdAt: now + index,
      }));
      const newHashes = txList
        .map((t) => t.smsHash)
        .filter((h): h is string => Boolean(h));
      return {
        ...prev,
        updatedAt: Date.now(),
        transactions: [...newTransactions, ...prev.transactions],
        importedSmsHashes: Array.from(
          new Set([...(prev.importedSmsHashes || []), ...newHashes])
        ),
      };
    });
  };

  const handleDeleteTransaction = (id: string) => {
    hasUserEditedRef.current = true;
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  };

  const handleSaveCard = (cardData: Omit<BankCard, 'id'>, existingId?: string) => {
    hasUserEditedRef.current = true;
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
    hasUserEditedRef.current = true;
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      cards: prev.cards.filter((c) => c.id !== id),
    }));
  };

  const handleSaveCategory = (cat: Category) => {
    hasUserEditedRef.current = true;
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
    hasUserEditedRef.current = true;
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      categories: prev.categories.filter((c) => c.id !== catId),
    }));
  };

  const handleSaveTag = (tag: TagItem) => {
    hasUserEditedRef.current = true;
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
    hasUserEditedRef.current = true;
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      tags: prev.tags.filter((t) => t.id !== tagId),
    }));
  };

  const handleUpdateBudget = (categoryId: string, monthlyLimit: number) => {
    hasUserEditedRef.current = true;
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
    hasUserEditedRef.current = true;
    if (partial.userName) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === activeUserId ? { ...u, name: partial.userName! } : u
        )
      );
    }
    if (partial.pinCode !== undefined) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === activeUserId ? { ...u, pinCode: partial.pinCode } : u
        )
      );
    }
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      settings: { ...prev.settings, ...partial },
    }));
  };

  const handleAddReminder = (rem: Omit<DueReminder, 'id'>) => {
    hasUserEditedRef.current = true;
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      reminders: [
        { ...rem, id: `rem_${Date.now()}` },
        ...(prev.reminders || []),
      ],
    }));
  };

  const handleUpdateReminder = (id: string, rem: Omit<DueReminder, 'id'>) => {
    hasUserEditedRef.current = true;
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      reminders: (prev.reminders || []).map((r) =>
        r.id === id ? { ...rem, id } : r
      ),
    }));
  };

  // Step installment check-off (+1 or -1) for recurring reminders
  const handleStepReminderInstallment = (id: string, delta: 1 | -1) => {
    hasUserEditedRef.current = true;
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      reminders: (prev.reminders || []).map((r) => {
        if (r.id !== id) return r;
        const recurrence = r.recurrence || 'once';
        const currentPaid = r.paidInstallments || 0;
        const total = r.totalInstallments || 0;
        const existingDates = Array.isArray(r.paidDates) ? r.paidDates : [];

        if (delta === 1) {
          if (total > 0 && currentPaid >= total) return r;
          const nextPaid = currentPaid + 1;
          const nextDates = [...existingDates, getCurrentJalaliDateStr()];

          if (total > 0 && nextPaid >= total) {
            return {
              ...r,
              paidInstallments: nextPaid,
              paidDates: nextDates,
              isPaid: true,
            };
          }

          return {
            ...r,
            paidInstallments: nextPaid,
            paidDates: nextDates,
            dueDate:
              recurrence !== 'once'
                ? advanceJalaliDate(r.dueDate, recurrence)
                : r.dueDate,
            isPaid: false,
          };
        } else {
          if (currentPaid <= 0) return r;
          const prevPaid = Math.max(0, currentPaid - 1);
          const nextDates = existingDates.slice(0, -1);
          const wasCompletedFinal = total > 0 && currentPaid >= total && r.isPaid;

          return {
            ...r,
            paidInstallments: prevPaid,
            paidDates: nextDates,
            dueDate:
              recurrence !== 'once' && !wasCompletedFinal
                ? rewindJalaliDate(r.dueDate, recurrence)
                : r.dueDate,
            isPaid: false,
          };
        }
      }),
    }));
  };

  const handleToggleReminderPaid = (id: string) => {
    hasUserEditedRef.current = true;
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      reminders: (prev.reminders || []).map((r) => {
        if (r.id !== id) return r;
        const recurrence = r.recurrence || 'once';

        if (!r.isPaid && recurrence !== 'once') {
          const nextPaidCount = (r.paidInstallments || 0) + 1;
          const nextDates = [
            ...(Array.isArray(r.paidDates) ? r.paidDates : []),
            getCurrentJalaliDateStr(),
          ];
          if (r.totalInstallments && nextPaidCount >= r.totalInstallments) {
            return {
              ...r,
              paidInstallments: nextPaidCount,
              paidDates: nextDates,
              isPaid: true,
            };
          }
          return {
            ...r,
            paidInstallments: nextPaidCount,
            paidDates: nextDates,
            dueDate: advanceJalaliDate(r.dueDate, recurrence),
            isPaid: false,
          };
        }

        return { ...r, isPaid: !r.isPaid };
      }),
    }));
  };

  const handleDeleteReminder = (id: string) => {
    hasUserEditedRef.current = true;
    setState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      reminders: (prev.reminders || []).filter((r) => r.id !== id),
      dismissedReminderIds: Array.from(
        new Set([...(prev.dismissedReminderIds || []), id])
      ),
    }));
  };

  const handleClearCurrentUserData = () => {
    hasUserEditedRef.current = true;
    const autoRepo = detectGitHubPagesRepo();
    const existingPin = state.settings.pinCode || activeUserObj.pinCode || '';
    const cleanState = createCleanUserState(
      activeUserId,
      state.settings.userName || activeUserObj.name,
      state.settings.colorTheme,
      state.settings.githubSync?.repoOwner || autoRepo.repoOwner,
      state.settings.githubSync?.repoName || autoRepo.repoName,
      state.settings.githubSync?.token || ''
    );
    cleanState.settings.pinCode = existingPin;
    setState({
      ...cleanState,
      updatedAt: Date.now(),
    });
  };

  const handleManualSyncNow = async () => {
    await pushStateToRemote(state);
    await pullStateFromRemote();
  };

  const currentUserName = state.settings.userName || activeUserObj.name || 'کاربر';
  const currentAccountPin = state.settings.pinCode || activeUserObj.pinCode || '';
  const needsFirstTimePinSetup = !currentAccountPin;

  // Target user for the Pre-Switch Password Verification Modal
  const switchTargetUserObj = switchTargetUserId
    ? users.find((u) => u.id === switchTargetUserId) || null
    : null;
  const effectiveTargetPin = switchTargetUserId
    ? remoteTargetPin || getStoredUserPin(switchTargetUserId)
    : '';

  // Per-User PIN Lock Screen (When user locks their account or opens a locked session)
  if (!isUnlocked && currentAccountPin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center space-y-5 shadow-2xl">
          <div className="flex justify-center">
            <CircularIcon name="lock" size="xl" color="#10b981" variant="solid" />
          </div>
          <div>
            <h1 className="text-lg font-black">
              ورود به حساب شخصی «{currentUserName}»
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              لطفاً رمز ۴ رقمی اختصاصی حساب «{currentUserName}» را وارد کنید
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
              if (val === currentAccountPin) {
                setIsUnlocked(true);
              } else if (val.length === 4) {
                setPinError(true);
              }
            }}
            placeholder="••••"
            className="w-40 mx-auto block px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-center text-2xl tracking-widest font-sans tabular-nums"
          />
          {pinError && (
            <p className="text-xs text-rose-400 font-bold">
              رمز وارد شده اشتباه است. دسترسی مجاز نیست.
            </p>
          )}

          {/* Switch to another user account (Still requires that user's PIN!) */}
          <div className="pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-2">
              ورود به حساب کاربری دیگر (نیازمند رمز اختصاصی آن حساب):
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {users
                .filter((u) => u.id !== activeUserId)
                .map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleRequestSwitchUser(u.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <Lock size={12} />
                    <span>حساب {u.name}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Render Pre-Switch Verification Modal even on Lock Screen if triggered */}
        {switchTargetUserObj &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
              <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4 shadow-2xl">
                <div className="flex justify-center">
                  <CircularIcon name="lock" size="lg" color="#10b981" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    ورود به حساب «{switchTargetUserObj.name}»
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isCheckingRemotePin
                      ? 'در حال بررسی وضعیت امنیتی حساب...'
                      : effectiveTargetPin
                      ? `برای ورود به حساب «${switchTargetUserObj.name}»، رمز ۴ رقمی اختصاصی این حساب را وارد کنید:`
                      : `برای ورود و فعال‌سازی امنیت حساب «${switchTargetUserObj.name}»، یک رمز ۴ رقمی برای آن تعیین کنید:`}
                  </p>
                </div>

                <input
                  type="password"
                  dir="ltr"
                  maxLength={4}
                  inputMode="numeric"
                  disabled={isCheckingRemotePin}
                  value={switchPinInput}
                  onChange={(e) => {
                    const val = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 4);
                    setSwitchPinInput(val);
                    setSwitchPinError('');
                    if (effectiveTargetPin && val.length === 4) {
                      if (val === effectiveTargetPin) {
                        executeVerifiedSwitchUser(switchTargetUserObj.id);
                      } else {
                        setSwitchPinError('رمز وارد شده اشتباه است! شما اجازه ورود به این حساب را ندارید.');
                      }
                    }
                  }}
                  placeholder="••••"
                  className="w-40 mx-auto block px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center text-2xl tracking-widest font-sans tabular-nums text-slate-900 dark:text-white"
                />

                {switchPinError && (
                  <p className="text-xs text-rose-500 font-bold">{switchPinError}</p>
                )}

                {!effectiveTargetPin && !isCheckingRemotePin && (
                  <button
                    type="button"
                    disabled={switchPinInput.length !== 4}
                    onClick={() => {
                      if (switchPinInput.length === 4) {
                        executeVerifiedSwitchUser(switchTargetUserObj.id, switchPinInput);
                      }
                    }}
                    className="w-full py-2.5 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
                  >
                    ثبت رمز ۴ رقمی و ورود به حساب
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSwitchTargetUserId(null)}
                  className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </div>,
            document.body
          )}
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
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Title + Active User Switcher Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                handleTabChange(0);
              }}
              className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white whitespace-nowrap"
            >
              هم‌حساب
            </a>

            <button
              type="button"
              onClick={() => setIsUserSwitcherOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-xs font-extrabold text-slate-800 dark:text-slate-100 cursor-pointer transition-all"
              title="مدیریت و امنیت حساب کاربری"
            >
              <span
                className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0"
                style={{ backgroundColor: activeUserObj.avatarColor || '#10b981' }}
              >
                {currentUserName.slice(0, 1)}
              </span>
              <span>حسابِ {currentUserName}</span>
              <Lock size={11} className="text-emerald-500" />
              <ChevronDown size={13} className="text-slate-400" />
            </button>
          </div>

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
              className="px-4 py-2 rounded-xl theme-gradient text-white text-xs font-extrabold shadow-sm hover:opacity-95 active:scale-95 transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Plus size={14} strokeWidth={2.6} />
              <span>ثبت تراکنش</span>
            </button>
          </div>
        </div>

        {/* Quick User Account Switcher Dropdown Bar (Strict Password-Protected) */}
        {isUserSwitcherOpen && (
          <div
            data-no-swipe="true"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md"
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ورود به حساب دیگر (نیازمند رمز ۴ رقمی آن حساب):
                </span>
                {users.map((u) => {
                  const isCurrent = u.id === activeUserId;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleRequestSwitchUser(u.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                        isCurrent
                          ? 'theme-bg text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isCurrent ? (
                        <User size={13} strokeWidth={2.3} />
                      ) : (
                        <Lock size={12} strokeWidth={2.3} />
                      )}
                      <span>{u.name}</span>
                      {u.id === 'hootan' && (
                        <ShieldCheck size={12} className="opacity-80" />
                      )}
                      {isCurrent && <Check size={13} strokeWidth={2.6} />}
                    </button>
                  );
                })}

                {currentAccountPin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUnlocked(false);
                      setIsUserSwitcherOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-extrabold cursor-pointer flex items-center gap-1"
                  >
                    <Lock size={12} />
                    <span>قفل کردن حساب فعلی</span>
                  </button>
                )}
              </div>

              {isAdminHootan ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const cleanPin = toEnglishDigits(quickNewUserPin).replace(/\D/g, '').slice(0, 4);
                    if (!quickNewUserName.trim() || cleanPin.length !== 4) return;
                    handleCreateUser(quickNewUserName.trim(), cleanPin);
                    setQuickNewUserName('');
                    setQuickNewUserPin('');
                  }}
                  className="flex flex-wrap items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={quickNewUserName}
                    onChange={(e) => setQuickNewUserName(e.target.value)}
                    placeholder="نام کاربر جدید..."
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white w-32"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={4}
                    value={quickNewUserPin}
                    onChange={(e) =>
                      setQuickNewUserPin(
                        toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 4)
                      )
                    }
                    placeholder="رمز ۴ رقمی"
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-center tabular-nums text-slate-900 dark:text-white w-24"
                  />
                  <button
                    type="submit"
                    disabled={!quickNewUserName.trim() || quickNewUserPin.length !== 4}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold cursor-pointer whitespace-nowrap flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                    <span>کاربر جدید</span>
                  </button>
                </form>
              ) : (
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>حساب سایر کاربران با رمز ۴ رقمی محافظت می‌شود</span>
                </span>
              )}
            </div>

            {userCreatedToast && (
              <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
                  {userCreatedToast}
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      <OfflineIndicator />

      {/* Main Content Area with Swipe Gesture Support */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${activeUserId}_${TABS[activeTabIndex].id}`}
            initial={{ opacity: 0, x: swipeDirection >= 0 ? -24 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: swipeDirection >= 0 ? 24 : -24 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTabIndex === 0 && (
              <HomeView
                state={state}
                onAddTransaction={() => {
                  setEditingTx(null);
                  setIsTxModalOpen(true);
                }}
                onOpenBankSms={() => {
                  setInitialBankSmsText('');
                  setIsBankSmsModalOpen(true);
                }}
                onEditTransaction={(tx) => {
                  setEditingTx(tx);
                  setIsTxModalOpen(true);
                }}
                onDeleteTransaction={handleDeleteTransaction}
                onNavigateTab={handleTabChange}
                onAddReminder={handleAddReminder}
                onUpdateReminder={handleUpdateReminder}
                onToggleReminderPaid={handleToggleReminderPaid}
                onStepReminderInstallment={handleStepReminderInstallment}
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
                users={users}
                activeUserId={activeUserId}
                onSwitchUser={handleRequestSwitchUser}
                onCreateUser={handleCreateUser}
                onDeleteUser={handleDeleteUser}
                onUpdateSettings={handleUpdateSettings}
                onUpdateBudget={handleUpdateBudget}
                onSaveCategory={handleSaveCategory}
                onDeleteCategory={handleDeleteCategory}
                onSaveTag={handleSaveTag}
                onDeleteTag={handleDeleteTag}
                onImportState={(newState) => {
                  hasUserEditedRef.current = true;
                  setState({ ...newState, userId: activeUserId, updatedAt: Date.now() });
                }}
                onClearCurrentUserData={handleClearCurrentUserData}
                onManualSyncNow={handleManualSyncNow}
                onLockAppNow={() => setIsUnlocked(false)}
                syncStatus={syncStatus}
                syncErrorMessage={syncErrorMessage}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-4 left-0 right-0 z-40 px-4 pointer-events-none">
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

      {/* Mandatory First-Time PIN Setup Modal (Ensures Hootan & every user sets a 4-digit PIN immediately) */}
      {needsFirstTimePinSetup &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4 shadow-2xl">
              <div className="flex justify-center">
                <CircularIcon name="shield" size="lg" color="#10b981" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  تعیین رمز ۴ رقمی اختصاصی حساب «{currentUserName}»
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  برای اینکه هیچ کاربر دیگری نتواند بدون اجازه وارد اکانت شخصی شما شود، یک رمز ۴ رقمی برای حساب «{currentUserName}» انتخاب کنید:
                </p>
              </div>

              <input
                type="text"
                dir="ltr"
                maxLength={4}
                inputMode="numeric"
                value={firstTimePinDraft}
                onChange={(e) => {
                  setFirstTimePinDraft(
                    toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 4)
                  );
                  setFirstTimePinError('');
                }}
                placeholder="مثلاً: 1370"
                className="w-44 mx-auto block px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center text-xl tracking-widest font-sans tabular-nums font-bold text-slate-900 dark:text-white"
              />

              {firstTimePinError && (
                <p className="text-xs text-rose-500 font-bold">{firstTimePinError}</p>
              )}

              <button
                type="button"
                onClick={() => {
                  const clean = toEnglishDigits(firstTimePinDraft)
                    .replace(/\D/g, '')
                    .slice(0, 4);
                  if (clean.length !== 4) {
                    setFirstTimePinError('رمز ورود باید دقیقاً ۴ رقم باشد.');
                    return;
                  }
                  handleUpdateSettings({ pinCode: clean });
                  setFirstTimePinDraft('');
                }}
                className="w-full py-3 rounded-2xl theme-bg text-white text-xs font-extrabold cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Check size={15} strokeWidth={2.5} />
                <span>ثبت رمز ۴ رقمی و قفل‌گذاری حساب</span>
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Pre-Switch User Password Verification Modal (Blocks unauthorized switching into Hootan or any other account) */}
      {switchTargetUserObj &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">تأیید هویت کاربر</span>
                <button
                  type="button"
                  onClick={() => setSwitchTargetUserId(null)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex justify-center">
                <CircularIcon name="lock" size="lg" color="#10b981" />
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  ورود به حساب «{switchTargetUserObj.name}»
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {isCheckingRemotePin
                    ? 'در حال بررسی رمز امنیتی حساب...'
                    : effectiveTargetPin
                    ? `برای ورود به حساب «${switchTargetUserObj.name}»، رمز ۴ رقمی اختصاصی این کاربر را وارد کنید:`
                    : `برای اولین ورود به حساب «${switchTargetUserObj.name}»، یک رمز ۴ رقمی اختصاصی برای آن تعیین کنید:`}
                </p>
              </div>

              <input
                type="password"
                dir="ltr"
                maxLength={4}
                inputMode="numeric"
                disabled={isCheckingRemotePin}
                value={switchPinInput}
                onChange={(e) => {
                  const val = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 4);
                  setSwitchPinInput(val);
                  setSwitchPinError('');
                  if (effectiveTargetPin && val.length === 4) {
                    if (val === effectiveTargetPin) {
                      executeVerifiedSwitchUser(switchTargetUserObj.id);
                    } else {
                      setSwitchPinError(
                        `رمز وارد شده اشتباه است! بدون رمز «${switchTargetUserObj.name}» امکان ورود وجود ندارد.`
                      );
                    }
                  }
                }}
                placeholder="••••"
                className="w-40 mx-auto block px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center text-2xl tracking-widest font-sans tabular-nums text-slate-900 dark:text-white"
              />

              {switchPinError && (
                <p className="text-xs text-rose-500 font-bold">{switchPinError}</p>
              )}

              {!effectiveTargetPin && !isCheckingRemotePin && (
                <button
                  type="button"
                  disabled={switchPinInput.length !== 4}
                  onClick={() => {
                    if (switchPinInput.length === 4) {
                      executeVerifiedSwitchUser(switchTargetUserObj.id, switchPinInput);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
                >
                  ثبت رمز ۴ رقمی و ورود به حساب
                </button>
              )}

              <button
                type="button"
                onClick={() => setSwitchTargetUserId(null)}
                className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                انصراف و ماندن در حساب «{currentUserName}»
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Add / Edit Transaction Modal & Bank SMS Reader Modal */}
      <div>
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

        <BankSmsModal
          isOpen={isBankSmsModalOpen}
          onClose={() => {
            setIsBankSmsModalOpen(false);
            setInitialBankSmsText('');
          }}
          state={state}
          onImportTransactions={handleImportBankSmsTransactions}
          onUpdateAutoCheckClipboard={(enabled) =>
            handleUpdateSettings({ autoCheckClipboardSms: enabled })
          }
          initialRawSms={initialBankSmsText}
        />
      </div>
    </div>
  );
}
