import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Check,
  Edit3,
  X,
  ArrowLeft,
  RotateCcw,
  Award,
  ChevronDown,
  ChevronUp,
  Clock,
  Banknote,
  Eye,
  EyeOff,
  Target,
  Sparkles,
  ArrowLeftRight,
  CreditCard,
} from 'lucide-react';
import {
  AppState,
  Transaction,
  DueReminder,
  ReminderRecurrence,
  SavingsGoal,
} from '../types';
import {
  formatMoney,
  formatJalaliReadable,
  toPersianDigits,
  toEnglishDigits,
  getMonthKey,
  formatMonthKeyReadable,
  getCurrentJalaliDateStr,
} from '../utils/persian';
import { CircularIcon } from './CircularIcon';
import { BankLogoVector, IRANIAN_BANKS } from '../utils/iranianBanks';
import { JalaliDateInput } from './JalaliDateTimePicker';

interface HomeViewProps {
  state: AppState;
  onAddTransaction: () => void;
  onOpenBankSms: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onNavigateTab: (index: number) => void;
  onAddReminder: (rem: Omit<DueReminder, 'id'>) => void;
  onUpdateReminder: (id: string, rem: Omit<DueReminder, 'id'>) => void;
  onToggleReminderPaid: (id: string, deductFromCardId?: string) => void;
  onStepReminderInstallment: (id: string, delta: 1 | -1, deductFromCardId?: string) => void;
  onDeleteReminder: (id: string) => void;
  onUpdateCashBalance: (newInitialCash: number) => void;
  onTogglePrivacyMode?: () => void;
  onSaveSavingsGoal?: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  onUpdateSavingsGoalAmount?: (goalId: string, deltaAmount: number) => void;
  onDeleteSavingsGoal?: (goalId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  state,
  onAddTransaction,
  onOpenBankSms,
  onEditTransaction,
  onDeleteTransaction,
  onNavigateTab,
  onAddReminder,
  onUpdateReminder,
  onToggleReminderPaid,
  onStepReminderInstallment,
  onDeleteReminder,
  onUpdateCashBalance,
  onTogglePrivacyMode,
  onSaveSavingsGoal,
  onUpdateSavingsGoalAmount,
  onDeleteSavingsGoal,
}) => {
  const {
    transactions,
    cards,
    categories,
    tags,
    reminders = [],
    savingsGoals = [],
    settings,
  } = state;
  const userName = settings.userName || settings.hootanName || 'کاربر';
  const isPrivacy = Boolean(settings.privacyMode);
  const maskMoney = (amount: number) => (isPrivacy ? '•••••••' : formatMoney(amount));

  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [cardFilter, setCardFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cash Balance quick add/edit state
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashMode, setCashMode] = useState<'add' | 'set'>('add');
  const [cashInputStr, setCashInputStr] = useState('');

  // Savings Goals (قلک‌ها و اهداف پس‌انداز) state
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetStr, setGoalTargetStr] = useState('');
  const [goalInitialSavedStr, setGoalInitialSavedStr] = useState('');
  const [goalDepositInputs, setGoalDepositInputs] = useState<Record<string, string>>({});

  // Installment Auto-Deduct card selector per reminder id
  const [installmentPaySourceMap, setInstallmentPaySourceMap] = useState<
    Record<string, string>
  >({});

  // Today's Vertical Timeline filter state (based on updatedAt)
  const [timelineScope, setTimelineScope] = useState<'today' | 'last24h' | 'latestDay'>('today');
  const [timelineHourFilter, setTimelineHourFilter] = useState<'all' | 'morning' | 'afternoon' | 'night'>('all');

  // Reminder Hub states
  const [reminderTab, setReminderTab] = useState<'scheduled' | 'tagged'>('scheduled');
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [remTitle, setRemTitle] = useState('');
  const [remAmountStr, setRemAmountStr] = useState('');
  const [remDueDate, setRemDueDate] = useState(() => getCurrentJalaliDateStr());
  const [remCategory, setRemCategory] = useState<DueReminder['category']>('installment');
  const [remRecurrence, setRemRecurrence] = useState<ReminderRecurrence>('monthly');
  const [remTotalInstallmentsStr, setRemTotalInstallmentsStr] = useState('12');
  const [expandedReminderIds, setExpandedReminderIds] = useState<Record<string, boolean>>({});

  const toggleReminderAccordion = (id: string) => {
    setExpandedReminderIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isMonochrome = settings.colorTheme === 'monochrome';

  // Calculate each card's real current balance (initial + incomes + transfersIn - expenses - transfersOut)
  const getCardCurrentBalance = (cardId: string, initialBalance: number) => {
    const cInc = transactions
      .filter(
        (t) =>
          (t.cardId === cardId && t.type === 'income') ||
          (t.toCardId === cardId && t.type === 'transfer')
      )
      .reduce((s, t) => s + t.amount, 0);
    const cExp = transactions
      .filter(
        (t) =>
          (t.cardId === cardId && t.type === 'expense') ||
          (t.cardId === cardId && t.type === 'transfer')
      )
      .reduce((s, t) => s + t.amount, 0);
    return initialBalance + cInc - cExp;
  };

  // Calculate live Cash Balance (موجودی نقدی) including ATM/card transfers
  const initialCashBalance = settings.initialCashBalance || 0;
  const cashIncomeTotal = transactions
    .filter(
      (t) =>
        (t.cardId === 'cash' && t.type === 'income') ||
        (t.toCardId === 'cash' && t.type === 'transfer')
    )
    .reduce((s, t) => s + t.amount, 0);
  const cashExpenseTotal = transactions
    .filter(
      (t) =>
        (t.cardId === 'cash' && t.type === 'expense') ||
        (t.cardId === 'cash' && t.type === 'transfer')
    )
    .reduce((s, t) => s + t.amount, 0);
  const currentCashBalance = initialCashBalance + cashIncomeTotal - cashExpenseTotal;

  const cardsTotalBalance = cards.reduce(
    (sum, c) => sum + getCardCurrentBalance(c.id, c.initialBalance),
    0
  );
  const totalNetWorth = cardsTotalBalance + currentCashBalance;
  const totalSavedInGoals = savingsGoals.reduce((s, g) => s + (g.savedAmount || 0), 0);
  const spendableNetWorth = Math.max(0, totalNetWorth - totalSavedInGoals);
  const nextUpcomingReminder = reminders
    .filter((r) => !r.isPaid)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  const handleSaveCashAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseInt(toEnglishDigits(cashInputStr).replace(/\D/g, '') || '0', 10);
    if (cashMode === 'add') {
      if (numeric <= 0) return;
      onUpdateCashBalance(initialCashBalance + numeric);
    } else {
      // Set exact current cash balance by adjusting initialCashBalance
      const targetInitial = numeric - cashIncomeTotal + cashExpenseTotal;
      onUpdateCashBalance(targetInitial);
    }
    setCashInputStr('');
    setIsEditingCash(false);
  };

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Identify tags for 'بدهی' (Debt), 'طلب' (Receivable), or 'قسط' (Installment)
  const debtOrReceivableTagIds = tags
    .filter(
      (t) =>
        t.id === 'tag_debt' ||
        t.id === 'tag_receivable' ||
        t.id === 'tag_installment' ||
        t.name.includes('بدهی') ||
        t.name.includes('طلب') ||
        t.name.includes('قسط')
    )
    .map((t) => t.id);

  const debtReceivableTransactions = transactions
    .filter((tx) => tx.tags.some((tagId) => debtOrReceivableTagIds.includes(tagId)))
    .sort((a, b) => b.jalaliDate.localeCompare(a.jalaliDate));

  // Filtered recent transactions
  const filteredTransactions = [...transactions]
    .filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (
        cardFilter !== 'all' &&
        tx.cardId !== cardFilter &&
        tx.toCardId !== cardFilter
      )
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const cat = categories.find((c) => c.id === tx.categoryId);
        const sub = cat?.subCategories.find((s) => s.id === tx.subCategoryId);
        const matchTitle = tx.title.toLowerCase().includes(q);
        const matchNote = (tx.note || '').toLowerCase().includes(q);
        const matchCat = (cat?.name || '').toLowerCase().includes(q);
        const matchSub = (sub?.name || '').toLowerCase().includes(q);
        return matchTitle || matchNote || matchCat || matchSub;
      }
      return true;
    })
    .sort((a, b) => {
      const dateCmp = b.jalaliDate.localeCompare(a.jalaliDate);
      if (dateCmp !== 0) return dateCmp;
      return b.time.localeCompare(a.time);
    });

  // ============================================================================
  // VERTICAL TIMELINE FOR TODAY'S TRANSACTIONS BY HOUR (FILTERED BY updatedAt)
  // ============================================================================
  const todayJalaliStr = getCurrentJalaliDateStr();
  const nowDateObj = new Date();
  const isSameDayAsNow = (timestamp: number) => {
    if (!timestamp) return false;
    const d = new Date(timestamp);
    return (
      d.getFullYear() === nowDateObj.getFullYear() &&
      d.getMonth() === nowDateObj.getMonth() &&
      d.getDate() === nowDateObj.getDate()
    );
  };

  // Extract hour (0..23) from updatedAt timestamp (or fallback to tx.time)
  const getTxUpdatedHourAndMinute = (tx: Transaction): { hour: number; timeLabel: string; ts: number } => {
    const ts = tx.updatedAt || tx.createdAt || 0;
    if (ts > 0) {
      const d = new Date(ts);
      const hh = d.getHours();
      const mm = d.getMinutes();
      const formatted = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      return { hour: hh, timeLabel: formatted, ts };
    }
    const parts = toEnglishDigits(tx.time || '12:00').split(':');
    const hh = Math.min(23, Math.max(0, parseInt(parts[0] || '12', 10) || 0));
    return { hour: hh, timeLabel: tx.time || '12:00', ts: 0 };
  };

  const latestTxJalaliDate =
    transactions.length > 0
      ? [...transactions].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))[0]
          ?.jalaliDate || todayJalaliStr
      : todayJalaliStr;

  const timelineTransactions = [...transactions]
    .filter((tx) => {
      const ts = tx.updatedAt || tx.createdAt || 0;
      if (timelineScope === 'today') {
        return isSameDayAsNow(ts) || tx.jalaliDate === todayJalaliStr;
      }
      if (timelineScope === 'last24h') {
        return ts > 0 && Date.now() - ts <= 24 * 60 * 60 * 1000;
      }
      // 'latestDay': matches most recently updated day's transactions
      return tx.jalaliDate === latestTxJalaliDate;
    })
    .filter((tx) => {
      if (timelineHourFilter === 'all') return true;
      const { hour } = getTxUpdatedHourAndMinute(tx);
      if (timelineHourFilter === 'morning') return hour >= 0 && hour < 12;
      if (timelineHourFilter === 'afternoon') return hour >= 12 && hour < 18;
      if (timelineHourFilter === 'night') return hour >= 18 && hour <= 23;
      return true;
    })
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

  // Group timeline transactions by Hour bucket (e.g. ساعت ۱۴:۰۰)
  const timelineHourGroups = React.useMemo(() => {
    const groupsMap = new Map<number, { hour: number; items: { tx: Transaction; timeLabel: string; ts: number }[] }>();
    for (const tx of timelineTransactions) {
      const info = getTxUpdatedHourAndMinute(tx);
      if (!groupsMap.has(info.hour)) {
        groupsMap.set(info.hour, { hour: info.hour, items: [] });
      }
      groupsMap.get(info.hour)!.items.push({ tx, timeLabel: info.timeLabel, ts: info.ts });
    }
    return Array.from(groupsMap.values()).sort((a, b) => b.hour - a.hour);
  }, [timelineTransactions]);

  const budgetPercent =
    settings.monthlyTotalBudget > 0
      ? Math.min(100, Math.round((totalExpense / settings.monthlyTotalBudget) * 100))
      : 0;

  const latestMonth =
    transactions.length > 0
      ? getMonthKey(transactions[0].jalaliDate)
      : getMonthKey(getCurrentJalaliDateStr());

  const handleSaveReminderForm = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(toEnglishDigits(remAmountStr).replace(/\D/g, '') || '0', 10);
    if (!remTitle.trim() || amt <= 0) return;
    const totalInst = parseInt(
      toEnglishDigits(remTotalInstallmentsStr).replace(/\D/g, '') || '0',
      10
    );
    const payload: Omit<DueReminder, 'id'> = {
      title: remTitle.trim(),
      amount: amt,
      dueDate: remDueDate.trim() || getCurrentJalaliDateStr(),
      category: remCategory,
      person: state.userId || 'hootan',
      isPaid: false,
      recurrence: remRecurrence,
      totalInstallments: remRecurrence !== 'once' && totalInst > 0 ? totalInst : undefined,
      paidInstallments: 0,
    };

    if (editingReminderId) {
      const existing = reminders.find((r) => r.id === editingReminderId);
      onUpdateReminder(editingReminderId, {
        ...payload,
        isPaid: existing?.isPaid || false,
        paidInstallments: existing?.paidInstallments || 0,
        paidDates: existing?.paidDates || [],
      });
    } else {
      onAddReminder(payload);
    }

    setRemTitle('');
    setRemAmountStr('');
    setRemTotalInstallmentsStr('12');
    setEditingReminderId(null);
    setIsAddingReminder(false);
  };

  const handleStartEditReminder = (rem: DueReminder) => {
    setEditingReminderId(rem.id);
    setRemTitle(rem.title);
    setRemAmountStr(String(rem.amount));
    setRemDueDate(rem.dueDate);
    setRemCategory(rem.category);
    setRemRecurrence(rem.recurrence || 'once');
    setRemTotalInstallmentsStr(rem.totalInstallments ? String(rem.totalInstallments) : '');
    setIsAddingReminder(true);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Compact 4-Tile Bento Grid at Top of HomeView */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tile 1: Spendable Balance (After Savings Goals) */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              موجودی قابل خرج (آزاد)
            </span>
            <Sparkles size={14} className="text-emerald-500 shrink-0" />
          </div>
          <div className="mt-2 tabular-nums">
            <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
              {maskMoney(spendableNetWorth)}{' '}
              <span className="text-[10px] font-normal text-slate-400">
                {settings.currencyUnit}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
              {totalSavedInGoals > 0
                ? `پس از کسر ${maskMoney(totalSavedInGoals)} قلک‌ها`
                : 'کل موجودی آزاد کارت‌ها و نقد'}
            </span>
          </div>
        </div>

        {/* Tile 2: Monthly Budget Status */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              وضعیت بودجه ماهانه
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold tabular-nums ${
                budgetPercent > 85
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {toPersianDigits(budgetPercent)}٪ مصرف
            </span>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tabular-nums truncate">
              {settings.monthlyTotalBudget > 0
                ? `مانده: ${maskMoney(
                    Math.max(0, settings.monthlyTotalBudget - totalExpense)
                  )}`
                : `خرج ماه: ${maskMoney(totalExpense)}`}
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  budgetPercent > 85 ? 'bg-rose-500' : 'theme-bg'
                }`}
                style={{ width: `${Math.min(100, budgetPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tile 3: Next Upcoming Installment */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              نزدیک‌ترین قسط پیش‌رو
            </span>
            <Clock size={14} className="text-amber-500 shrink-0" />
          </div>
          {nextUpcomingReminder ? (
            <div className="mt-2 tabular-nums">
              <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                {nextUpcomingReminder.title}
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-0.5 truncate">
                {maskMoney(nextUpcomingReminder.amount)} ·{' '}
                {formatJalaliReadable(nextUpcomingReminder.dueDate)}
              </span>
            </div>
          ) : (
            <div className="mt-2">
              <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                بدون قسط معوق
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                همه تعهدات به‌روز هستند
              </span>
            </div>
          )}
        </div>

        {/* Tile 4: Cash Wallet Quick Tile */}
        <div
          onClick={() => {
            setIsEditingCash(true);
            setCashMode('add');
          }}
          className="p-3.5 rounded-2xl bg-emerald-500/8 dark:bg-emerald-500/12 border border-emerald-500/25 flex flex-col justify-between cursor-pointer hover:border-emerald-500/50 transition-all"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300">
              کیف پول نقدی (نقد)
            </span>
            <Banknote size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="mt-2 tabular-nums">
            <div className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300 truncate">
              {maskMoney(currentCashBalance)}{' '}
              <span className="text-[10px] font-normal">{settings.currencyUnit}</span>
            </div>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-bold block mt-0.5">
              + کلیک برای افزایش سریع نقد
            </span>
          </div>
        </div>
      </div>

      {/* Top Hero Balance & Personal Cards + Cash Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Main Hero Balance Card (Slim & Compact) */}
        <div className="lg:col-span-7 rounded-2xl sm:rounded-3xl theme-gradient text-white px-4 py-3.5 sm:px-5 sm:py-4 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -left-14 -top-14 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -right-10 -bottom-14 w-44 h-44 rounded-full bg-black/15 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <CircularIcon name="wallet" size="sm" variant="glass" />
              <div>
                <span className="text-[11px] sm:text-xs text-white/90 font-bold block leading-tight">
                  موجودی کل دارایی {userName} ({toPersianDigits(cards.length)} کارت + موجودی نقدی)
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-white/80">
                  دوره فعلی · {formatMonthKeyReadable(latestMonth)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onTogglePrivacyMode && (
                <button
                  type="button"
                  onClick={onTogglePrivacyMode}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs active:scale-95 transition-all cursor-pointer"
                  title={
                    isPrivacy
                      ? 'نمایش اعداد و مبالغ'
                      : 'مخفی‌سازی اعداد در جمع (حالت حریم خصوصی)'
                  }
                >
                  {isPrivacy ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              )}
              <button
                type="button"
                onClick={onOpenBankSms}
                className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-[11px] sm:text-xs backdrop-blur-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                title="خواندن خودکار پیامک‌های بانکی"
              >
                <MessageSquare size={13} strokeWidth={2.4} />
                <span>پیامک بانکی</span>
              </button>
              <button
                type="button"
                onClick={onAddTransaction}
                className="flex items-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white text-slate-900 font-extrabold text-[11px] sm:text-xs shadow-sm hover:bg-white/90 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus size={14} strokeWidth={2.6} />
                <span>ثبت دخل و خرج</span>
              </button>
            </div>
          </div>

          <div className="relative z-10 my-2.5 sm:my-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2.5">
            <div>
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight leading-none">
                  {maskMoney(totalNetWorth)}
                </h2>
                <span className="text-xs font-medium text-white/85">
                  {settings.currencyUnit}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-white/85 mt-1.5 tabular-nums">
                <span>جمع کارت‌ها: {maskMoney(cardsTotalBalance)}</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingCash(true);
                    setCashMode('add');
                    setCashInputStr('');
                  }}
                  className="underline decoration-white/50 hover:decoration-white font-extrabold cursor-pointer"
                >
                  موجودی نقدی: {maskMoney(currentCashBalance)} {settings.currencyUnit} (+ افزایش نقد)
                </button>
              </div>
            </div>

            {/* Budget Progress Bar */}
            {settings.monthlyTotalBudget > 0 && (
              <div className="w-full sm:max-w-[230px]">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-white/90 mb-1">
                  <span>مصرف بودجه</span>
                  <span className="tabular-nums font-bold">
                    {toPersianDigits(budgetPercent)}٪ از {maskMoney(settings.monthlyTotalBudget)}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black/25 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      budgetPercent > 90 ? 'bg-rose-300' : 'bg-white'
                    }`}
                    style={{ width: `${budgetPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Income vs Expense Strip */}
          <div className="relative z-10 grid grid-cols-2 gap-2.5 pt-2.5 border-t border-white/15">
            <div className="flex items-center gap-2">
              <CircularIcon name="arrow-down" size="xs" variant="glass" />
              <div className="min-w-0">
                <span className="text-[10px] text-white/75 block leading-tight">کل ورودی / درآمد</span>
                <span className="text-xs sm:text-sm font-extrabold tabular-nums text-emerald-100">
                  +{maskMoney(totalIncome)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CircularIcon name="arrow-up" size="xs" variant="glass" />
              <div className="min-w-0">
                <span className="text-[10px] text-white/75 block leading-tight">کل هزینه‌ها / خرج</span>
                <span className="text-xs sm:text-sm font-extrabold tabular-nums text-rose-100">
                  -{maskMoney(totalExpense)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Bank Cards & Cash Wallet Live Balances Summary */}
        <div className="lg:col-span-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircularIcon name="credit-card" size="xs" color="#0ea5e9" />
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  موجودی کارت‌ها و نقدی {userName}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  برای مشاهده تراکنش‌های هر کارت یا نقدی، روی آن کلیک کنید
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab(1)}
              className="text-xs font-bold theme-text hover:underline cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <span>مدیریت کارت‌ها</span>
              <ArrowLeft size={13} />
            </button>
          </div>

          {/* Dedicated Cash Balance Row + Inline Quick Adder */}
          <div className="p-2.5 rounded-2xl bg-emerald-500/8 dark:bg-emerald-500/12 border border-emerald-500/25 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCardFilter(cardFilter === 'cash' ? 'all' : 'cash')}
                className="flex items-center gap-2 min-w-0 text-right cursor-pointer"
                title="مشاهده تراکنش‌های نقدی"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Banknote size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                    <span>موجودی نقدی (کیف پول نقد)</span>
                    {cardFilter === 'cash' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500 text-white">
                        فیلتر فعال
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {toPersianDigits(transactions.filter((t) => t.cardId === 'cash').length)} تراکنش نقدی
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-black tabular-nums text-emerald-700 dark:text-emerald-300">
                  {formatMoney(currentCashBalance)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingCash((prev) => !prev);
                    setCashMode('add');
                    setCashInputStr('');
                  }}
                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold cursor-pointer flex items-center gap-0.5"
                  title="افزودن یا ویرایش موجودی نقدی"
                >
                  <Plus size={11} strokeWidth={2.6} />
                  <span>افزودن نقد</span>
                </button>
              </div>
            </div>

            {isEditingCash && (
              <form
                onSubmit={handleSaveCashAdjustment}
                className="pt-2 border-t border-emerald-500/20 space-y-2"
              >
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCashMode('add')}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer ${
                      cashMode === 'add'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    + افزایش موجودی نقدی
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCashMode('set');
                      setCashInputStr(String(Math.max(0, currentCashBalance)));
                    }}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer ${
                      cashMode === 'set'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    تنظیم دقیق کل موجودی نقد
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={
                      cashInputStr
                        ? formatMoney(
                            parseInt(toEnglishDigits(cashInputStr).replace(/\D/g, '') || '0', 10)
                          )
                        : ''
                    }
                    onChange={(e) =>
                      setCashInputStr(toEnglishDigits(e.target.value).replace(/\D/g, ''))
                    }
                    placeholder={
                      cashMode === 'add'
                        ? `مبلغ افزایش (${settings.currencyUnit})...`
                        : `موجودی نقدی جدید (${settings.currencyUnit})...`
                    }
                    className="flex-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/40 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer"
                  >
                    ثبت
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingCash(false)}
                    className="p-1.5 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-500 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
              </form>
            )}
          </div>

          {cards.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">
              هنوز کارت بانکی ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-2.5">
              {cards.slice(0, 4).map((c) => {
                const bal = getCardCurrentBalance(c.id, c.initialBalance);
                const bank = IRANIAN_BANKS[c.bankId] || IRANIAN_BANKS.other;
                const pct =
                  totalNetWorth > 0
                    ? Math.max(0, Math.min(100, Math.round((bal / totalNetWorth) * 100)))
                    : 0;
                const isCardFiltered = cardFilter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCardFilter(isCardFiltered ? 'all' : c.id)}
                    className={`w-full text-right space-y-1 p-1.5 -mx-1.5 rounded-xl transition-colors cursor-pointer ${
                      isCardFiltered
                        ? 'bg-sky-500/10 ring-1 ring-sky-500/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <BankLogoVector bankId={c.bankId} size={22} mono={isMonochrome} />
                        <span className="font-bold text-slate-700 dark:text-slate-200 truncate">
                          {c.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 tabular-nums shrink-0">
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {formatMoney(bal)}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {toPersianDigits(pct)}٪
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: bank.accentColor || '#10b981',
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Card Logos Footer */}
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center -space-x-2 space-x-reverse">
              {cards.slice(0, 6).map((c) => (
                <BankLogoVector
                  key={c.id}
                  bankId={c.bankId}
                  size={26}
                  mono={isMonochrome}
                  className="ring-2 ring-white dark:ring-slate-900"
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab(1)}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>همه کارت‌ها و نقدی ({toPersianDigits(cards.length)})</span>
              <ArrowLeft size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* REMINDERS HUB */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CircularIcon name="clock" size="sm" color="#f59e0b" />
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                یادآور اقساط، بدهی‌ها، مطالبات و اجاره
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تیک زدن هر نوبت واریز، کسر خودکار از تعداد اقساط باقی‌مانده و انتقال سررسید به دوره بعد
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setReminderTab('scheduled')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                  reminderTab === 'scheduled'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                سررسید اقساط ({toPersianDigits(reminders.filter((r) => !r.isPaid).length)})
              </button>
              <button
                type="button"
                onClick={() => setReminderTab('tagged')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                  reminderTab === 'tagged'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                تراکنش‌های #بدهی و #طلب ({toPersianDigits(debtReceivableTransactions.length)})
              </button>
            </div>

            {reminderTab === 'scheduled' && (
              <button
                type="button"
                onClick={() => {
                  if (isAddingReminder) {
                    setIsAddingReminder(false);
                    setEditingReminderId(null);
                  } else {
                    setEditingReminderId(null);
                    setRemTitle('');
                    setRemAmountStr('');
                    setRemTotalInstallmentsStr('12');
                    setRemRecurrence('monthly');
                    setIsAddingReminder(true);
                  }
                }}
                className="px-3 py-2 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer flex items-center gap-1 whitespace-nowrap"
              >
                {isAddingReminder ? (
                  <>
                    <X size={14} />
                    <span>بستن فرم</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} strokeWidth={2.5} />
                    <span>یادآور / قسط جدید</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Sub-view A: Transactions Tagged with 'بدهی' or 'طلب' */}
        {reminderTab === 'tagged' && (
          <div>
            {debtReceivableTransactions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <p>هیچ تراکنشی با تگ «#بدهی» یا «#طلب» ثبت نشده است.</p>
                <button
                  type="button"
                  onClick={onAddTransaction}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>ثبت تراکنش با تگ بدهی یا طلب</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {debtReceivableTransactions.map((tx) => {
                  const txTagObjects = tags.filter((t) => tx.tags.includes(t.id));
                  const isReceivable = txTagObjects.some(
                    (t) => t.id === 'tag_receivable' || t.name.includes('طلب')
                  );

                  return (
                    <div
                      key={tx.id}
                      onClick={() => onEditTransaction(tx)}
                      className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CircularIcon
                          name={isReceivable ? 'arrow-down' : 'arrow-up'}
                          color={isReceivable ? '#10b981' : '#ef4444'}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {tx.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {isReceivable ? 'طلب' : 'بدهی / قسط'}
                            </span>
                            <span>·</span>
                            <span className="tabular-nums">
                              {formatJalaliReadable(tx.jalaliDate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-left shrink-0 tabular-nums">
                        <div
                          className={`text-xs sm:text-sm font-black ${
                            isReceivable
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatMoney(tx.amount)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {txTagObjects.map((t) => `#${t.name}`).join(' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sub-view B: Scheduled Installments, Rent & Debt Reminders */}
        {reminderTab === 'scheduled' && (
          <div className="space-y-3">
            {isAddingReminder && (
              <form
                onSubmit={handleSaveReminderForm}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      عنوان تعهد (قسط، اجاره، بدهی، طلب)
                    </label>
                    <input
                      type="text"
                      value={remTitle}
                      onChange={(e) => setRemTitle(e.target.value)}
                      placeholder="مثلاً: قسط وام یا اسنپ‌پی"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      مبلغ هر قسط / نوبت ({settings.currencyUnit})
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        remAmountStr
                          ? formatMoney(
                              parseInt(
                                toEnglishDigits(remAmountStr).replace(/\D/g, '') || '0',
                                10
                              )
                            )
                          : ''
                      }
                      onChange={(e) =>
                        setRemAmountStr(toEnglishDigits(e.target.value).replace(/\D/g, ''))
                      }
                      placeholder="۳،۲۰۰،۰۰۰"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold tabular-nums"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      تاریخ سررسید بعدی
                    </label>
                    <JalaliDateInput
                      value={remDueDate}
                      onChange={(newDate) => setRemDueDate(newDate)}
                      placeholder="انتخاب تاریخ سررسید"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      نوع تعهد
                    </label>
                    <select
                      value={remCategory}
                      onChange={(e) =>
                        setRemCategory(e.target.value as DueReminder['category'])
                      }
                      className="w-full px-2 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    >
                      <option value="installment">قسط وام / خرید</option>
                      <option value="rent">اجاره و شارژ</option>
                      <option value="debt">بدهی</option>
                      <option value="receivable">طلب دریافتی</option>
                      <option value="bill">قبض</option>
                    </select>
                  </div>
                </div>

                {/* Second row of form: Recurrence + Total Installments */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end pt-1">
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      دوره تکرار خودکار
                    </label>
                    <select
                      value={remRecurrence}
                      onChange={(e) =>
                        setRemRecurrence(e.target.value as ReminderRecurrence)
                      }
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    >
                      <option value="monthly">تکرار ماهانه (هر ماه)</option>
                      <option value="yearly">تکرار سالانه (هر سال)</option>
                      <option value="quarterly">تکرار هر ۳ ماه (فصلی)</option>
                      <option value="weekly">تکرار هفتگی</option>
                      <option value="once">بدون تکرار (فقط یک‌بار)</option>
                    </select>
                  </div>

                  {remRecurrence !== 'once' && (
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        تعداد کل اقساط / دفعات (برای تیک زدن)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={toPersianDigits(remTotalInstallmentsStr)}
                        onChange={(e) =>
                          setRemTotalInstallmentsStr(
                            toEnglishDigits(e.target.value).replace(/\D/g, '')
                          )
                        }
                        placeholder="مثلاً ۱۲ یا ۲۴ (خالی = دائمی)"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold tabular-nums"
                      />
                    </div>
                  )}

                  <div
                    className={
                      remRecurrence !== 'once'
                        ? 'sm:col-span-3 flex gap-2'
                        : 'sm:col-span-7 flex gap-2'
                    }
                  >
                    <button
                      type="submit"
                      className="flex-1 py-2 px-4 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer"
                    >
                      {editingReminderId ? 'ذخیره تغییرات' : 'ثبت یادآور'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {reminders.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <p>هیچ یادآور یا قسطی در حساب شما ثبت نشده است.</p>
                <button
                  type="button"
                  onClick={() => setIsAddingReminder(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>افزودن قسط یا یادآور جدید</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {reminders.map((rem) => {
                  const catLabel =
                    rem.category === 'installment'
                      ? 'قسط وام'
                      : rem.category === 'rent'
                      ? 'اجاره و مسکن'
                      : rem.category === 'debt'
                      ? 'بدهی'
                      : rem.category === 'receivable'
                      ? 'طلب'
                      : 'قبض';

                  const recLabel =
                    rem.recurrence === 'monthly'
                      ? 'ماهانه'
                      : rem.recurrence === 'yearly'
                      ? 'سالانه'
                      : rem.recurrence === 'quarterly'
                      ? 'هر ۳ ماه'
                      : rem.recurrence === 'weekly'
                      ? 'هفتگی'
                      : '';

                  const isRecurring = Boolean(
                    rem.recurrence && rem.recurrence !== 'once'
                  );
                  const paidCount = rem.paidInstallments || 0;
                  const totalCount = rem.totalInstallments || 0;
                  const remainingCount =
                    totalCount > 0 ? Math.max(0, totalCount - paidCount) : null;
                  const progressPct =
                    totalCount > 0
                      ? Math.min(100, Math.round((paidCount / totalCount) * 100))
                      : 0;

                  return (
                    <div
                      key={rem.id}
                      className={`p-4 rounded-2xl border space-y-3 transition-all ${
                        rem.isPaid
                          ? 'border-emerald-500/30 bg-emerald-500/5 opacity-75'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50'
                      }`}
                    >
                      {/* Top Header of Reminder Card */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              isRecurring && !rem.isPaid
                                ? onStepReminderInstallment(rem.id, 1)
                                : onToggleReminderPaid(rem.id)
                            }
                            title={
                              rem.isPaid
                                ? 'فعال‌سازی مجدد'
                                : isRecurring
                                ? 'تیک زدن واریز این نوبت و کم شدن از اقساط مانده'
                                : 'علامت به عنوان تسویه شده'
                            }
                            className="cursor-pointer shrink-0"
                          >
                            <CircularIcon
                              name={rem.isPaid ? 'check' : 'clock'}
                              color={rem.isPaid ? '#10b981' : '#f59e0b'}
                              size="sm"
                              variant={rem.isPaid ? 'solid' : 'soft'}
                            />
                          </button>

                          <div
                            onClick={() => handleStartEditReminder(rem)}
                            className="min-w-0 cursor-pointer"
                            title="برای ویرایش عنوان یا تعداد اقساط کلیک کنید"
                          >
                            <h4
                              className={`text-xs sm:text-sm font-extrabold truncate ${
                                rem.isPaid
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {rem.title}
                            </h4>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                              {catLabel}
                              {recLabel ? ` · تکرار ${recLabel}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="text-left tabular-nums ml-1">
                            <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                              {formatMoney(rem.amount)}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {rem.isPaid ? 'تسویه کامل' : `${settings.currencyUnit} / نوبت`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStartEditReminder(rem)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer"
                            title="ویرایش یادآور"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteReminder(rem.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer"
                            title="حذف دائمی یادآور"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Accordion (کرکره‌ای) for Installment Tracker & Check-Off Section */}
                      {isRecurring ? (
                        <div className="rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 overflow-hidden">
                          {/* Compact Always-Visible Accordion Header */}
                          <button
                            type="button"
                            onClick={() => toggleReminderAccordion(rem.id)}
                            className="w-full px-3 py-2 flex items-center justify-between gap-2 text-xs tabular-nums hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                          >
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 text-right">
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Check size={12} strokeWidth={2.6} />
                                <span>
                                  {toPersianDigits(paidCount)}
                                  {totalCount > 0 ? `/${toPersianDigits(totalCount)}` : ' نوبت'} پرداخت‌شده
                                </span>
                              </span>

                              {remainingCount !== null && (
                                <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px]">
                                  · {toPersianDigits(remainingCount)} مانده
                                </span>
                              )}

                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                ·{' '}
                                {rem.isPaid
                                  ? 'تسویه کامل'
                                  : `سررسید: ${formatJalaliReadable(rem.dueDate)}`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              <span>{expandedReminderIds[rem.id] ? 'بستن' : 'اقساط'}</span>
                              {expandedReminderIds[rem.id] ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                            </div>
                          </button>

                          {/* Expandable Body (Hidden by default to save space) */}
                          {expandedReminderIds[rem.id] && (
                            <div className="px-3 pb-3 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                              {/* Progress bar + Remaining Money if totalInstallments is set */}
                              {totalCount > 0 ? (
                                <div className="space-y-1">
                                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                      style={{ width: `${progressPct}%` }}
                                    />
                                  </div>
                                  {remainingCount !== null && remainingCount > 0 && (
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 tabular-nums">
                                      <span>پیشرفت اقساط: {toPersianDigits(progressPct)}٪</span>
                                      <span>
                                        مبلغ کل باقی‌مانده:{' '}
                                        {formatMoney(
                                          remainingCount * rem.amount,
                                          true,
                                          settings.currencyUnit
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditReminder(rem)}
                                  className="text-[11px] font-bold text-sky-500 hover:underline cursor-pointer block"
                                >
                                  + تعیین تعداد کل اقساط
                                </button>
                              )}

                              {/* Interactive Checkboxes for Installments (when totalCount <= 36) */}
                              {totalCount > 0 && totalCount <= 36 && (
                                <div
                                  data-no-swipe="true"
                                  onTouchStart={(e) => e.stopPropagation()}
                                  onTouchMove={(e) => e.stopPropagation()}
                                  onTouchEnd={(e) => e.stopPropagation()}
                                  className="flex flex-wrap items-center gap-1.5 pt-0.5"
                                >
                                  {Array.from({ length: totalCount }, (_, i) => i + 1).map(
                                    (instNum) => {
                                      const isChecked = instNum <= paidCount;
                                      const isNext = instNum === paidCount + 1;
                                      const isLastChecked = instNum === paidCount;

                                      return (
                                        <button
                                          key={instNum}
                                          type="button"
                                          onClick={() => {
                                            if (isNext) {
                                              onStepReminderInstallment(rem.id, 1);
                                            } else if (isLastChecked) {
                                              onStepReminderInstallment(rem.id, -1);
                                            } else if (!isChecked) {
                                              onStepReminderInstallment(rem.id, 1);
                                            }
                                          }}
                                          title={
                                            isChecked
                                              ? `قسط ${toPersianDigits(instNum)} پرداخت شده (برای لغو کلیک کنید)`
                                              : `تیک زدن قسط ${toPersianDigits(instNum)}`
                                          }
                                          className={`h-7 min-w-[32px] px-1.5 rounded-lg text-[11px] font-extrabold tabular-nums flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                                            isChecked
                                              ? 'bg-emerald-500 text-white shadow-2xs'
                                              : isNext
                                              ? 'border-2 border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                                              : 'border border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-400'
                                          }`}
                                        >
                                          <span>{toPersianDigits(instNum)}</span>
                                          {isChecked && <Check size={11} strokeWidth={2.8} />}
                                        </button>
                                      );
                                    }
                                  )}
                                </div>
                              )}

                              {/* Action Buttons to Check Off Next Payment (+ Optional Auto-Deduct from Card/Cash) */}
                              <div className="space-y-2 pt-1">
                                {!rem.isPaid && (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                      <CreditCard size={12} />
                                      <span>کسر خودکار این قسط از:</span>
                                    </span>
                                    <select
                                      value={installmentPaySourceMap[rem.id] || 'none'}
                                      onChange={(e) =>
                                        setInstallmentPaySourceMap((prev) => ({
                                          ...prev,
                                          [rem.id]: e.target.value,
                                        }))
                                      }
                                      className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200"
                                    >
                                      <option value="none">
                                        فقط تیک قسط (بدون کسر از موجودی کارت)
                                      </option>
                                      <option value="cash">
                                        کسر از موجودی نقدی ({maskMoney(currentCashBalance)})
                                      </option>
                                      {cards.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          کسر از {c.title} (
                                          {maskMoney(
                                            getCardCurrentBalance(c.id, c.initialBalance)
                                          )}
                                          )
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                <div className="flex items-center justify-between gap-2">
                                  {!rem.isPaid ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const chosenSource =
                                          installmentPaySourceMap[rem.id];
                                        onStepReminderInstallment(
                                          rem.id,
                                          1,
                                          chosenSource && chosenSource !== 'none'
                                            ? chosenSource
                                            : undefined
                                        );
                                      }}
                                      className="flex-1 py-2 px-3 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs hover:opacity-95"
                                    >
                                      <Check size={14} strokeWidth={2.6} />
                                      <span>
                                        تیک قسط {toPersianDigits(paidCount + 1)}
                                        {installmentPaySourceMap[rem.id] &&
                                        installmentPaySourceMap[rem.id] !== 'none'
                                          ? ' + ثبت خودکار هزینه از حساب'
                                          : remainingCount !== null && remainingCount > 0
                                          ? ` (مانده: ${toPersianDigits(
                                              remainingCount - 1
                                            )} قسط)`
                                          : ''}
                                      </span>
                                    </button>
                                  ) : (
                                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <Award size={14} strokeWidth={2.4} />
                                      <span>تمام اقساط این تعهد تسویه شده است</span>
                                    </span>
                                  )}

                                  {paidCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => onStepReminderInstallment(rem.id, -1)}
                                      className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1"
                                      title="لغو آخرین تیک واریز و بازگشت قسط"
                                    >
                                      <RotateCcw size={12} />
                                      <span>اصلاح</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
                          <span className="tabular-nums">
                            سررسید: {formatJalaliReadable(rem.dueDate)}
                          </span>
                          <div className="flex items-center gap-2">
                            {!rem.isPaid && (
                              <select
                                value={installmentPaySourceMap[rem.id] || 'none'}
                                onChange={(e) =>
                                  setInstallmentPaySourceMap((prev) => ({
                                    ...prev,
                                    [rem.id]: e.target.value,
                                  }))
                                }
                                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300"
                              >
                                <option value="none">بدون کسر از کارت</option>
                                <option value="cash">کسر از نقد</option>
                                {cards.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    کسر از {c.title}
                                  </option>
                                ))}
                              </select>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const chosenSource = installmentPaySourceMap[rem.id];
                                onToggleReminderPaid(
                                  rem.id,
                                  !rem.isPaid && chosenSource && chosenSource !== 'none'
                                    ? chosenSource
                                    : undefined
                                );
                              }}
                              className="text-xs font-bold theme-text hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {rem.isPaid ? (
                                <>
                                  <RotateCcw size={12} />
                                  <span>برگرداندن به حالت پرداخت‌نشده</span>
                                </>
                              ) : (
                                <>
                                  <Check size={13} strokeWidth={2.5} />
                                  <span>تیک تسویه کامل</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================================== */}
      {/* SAVINGS GOALS & VAULTS (قلک‌ها و اهداف پس‌انداز)                          */}
      {/* ======================================================================== */}
      {onSaveSavingsGoal && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Target size={19} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  قلک‌ها و اهداف پس‌انداز ({toPersianDigits(savingsGoals.length)} هدف)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  جدا کردن مبالغ پس‌انداز (سفر، خرید طلا، صندوق اضطراری) از موجودی قابل خرج روزمره
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingGoal((prev) => !prev)}
              className="px-3.5 py-2 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer flex items-center gap-1 self-start sm:self-auto"
            >
              {isAddingGoal ? (
                <>
                  <X size={14} />
                  <span>بستن فرم قلک</span>
                </>
              ) : (
                <>
                  <Plus size={14} strokeWidth={2.5} />
                  <span>ساخت قلک / هدف پس‌انداز جدید</span>
                </>
              )}
            </button>
          </div>

          {isAddingGoal && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const targetNum = parseInt(
                  toEnglishDigits(goalTargetStr).replace(/\D/g, '') || '0',
                  10
                );
                const savedNum = parseInt(
                  toEnglishDigits(goalInitialSavedStr).replace(/\D/g, '') || '0',
                  10
                );
                if (!goalTitle.trim() || targetNum <= 0) return;
                onSaveSavingsGoal({
                  title: goalTitle.trim(),
                  targetAmount: targetNum,
                  savedAmount: savedNum,
                  color: '#10b981',
                  icon: 'award',
                });
                setGoalTitle('');
                setGoalTargetStr('');
                setGoalInitialSavedStr('');
                setIsAddingGoal(false);
              }}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
            >
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  عنوان قلک / هدف پس‌انداز
                </label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="مثلاً: خرید طلا، سفر، صندوق اضطراری..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  مبلغ هدف کل ({settings.currencyUnit})
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    goalTargetStr
                      ? formatMoney(
                          parseInt(
                            toEnglishDigits(goalTargetStr).replace(/\D/g, '') || '0',
                            10
                          )
                        )
                      : ''
                  }
                  onChange={(e) =>
                    setGoalTargetStr(toEnglishDigits(e.target.value).replace(/\D/g, ''))
                  }
                  placeholder="۵۰،۰۰۰،۰۰۰"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold tabular-nums"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  پس‌انداز فعلی در این قلک ({settings.currencyUnit})
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    goalInitialSavedStr
                      ? formatMoney(
                          parseInt(
                            toEnglishDigits(goalInitialSavedStr).replace(/\D/g, '') || '0',
                            10
                          )
                        )
                      : ''
                  }
                  onChange={(e) =>
                    setGoalInitialSavedStr(
                      toEnglishDigits(e.target.value).replace(/\D/g, '')
                    )
                  }
                  placeholder="۰"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold tabular-nums"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer"
                >
                  ثبت قلک
                </button>
              </div>
            </form>
          )}

          {savingsGoals.length === 0 ? (
            <div className="py-5 text-center text-xs text-slate-400">
              هنوز قلک یا هدف پس‌اندازی نساخته‌اید. با ساخت قلک، مبلغ پس‌انداز از موجودی قابل خرج روزمره تفکیک می‌شود.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {savingsGoals.map((goal) => {
                const pct =
                  goal.targetAmount > 0
                    ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
                    : 0;
                const depositRaw = goalDepositInputs[goal.id] || '';
                const depositNumeric = parseInt(
                  toEnglishDigits(depositRaw).replace(/\D/g, '') || '0',
                  10
                );

                return (
                  <div
                    key={goal.id}
                    className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                          {goal.title}
                        </h4>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          پس‌انداز شده: {maskMoney(goal.savedAmount)} از{' '}
                          {maskMoney(goal.targetAmount)} {settings.currencyUnit}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {toPersianDigits(pct)}٪
                        </span>
                        {onDeleteSavingsGoal && (
                          <button
                            type="button"
                            onClick={() => onDeleteSavingsGoal(goal.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="حذف قلک"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full theme-bg transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {onUpdateSavingsGoalAmount && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={depositNumeric > 0 ? formatMoney(depositNumeric) : ''}
                          onChange={(e) =>
                            setGoalDepositInputs((prev) => ({
                              ...prev,
                              [goal.id]: toEnglishDigits(e.target.value).replace(/\D/g, ''),
                            }))
                          }
                          placeholder={`مبلغ واریز/برداشت (${settings.currencyUnit})...`}
                          className="flex-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (depositNumeric <= 0) return;
                            onUpdateSavingsGoalAmount(goal.id, depositNumeric);
                            setGoalDepositInputs((prev) => ({ ...prev, [goal.id]: '' }));
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-extrabold cursor-pointer whitespace-nowrap"
                        >
                          + واریز به قلک
                        </button>
                        {goal.savedAmount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (depositNumeric <= 0) return;
                              onUpdateSavingsGoalAmount(goal.id, -depositNumeric);
                              setGoalDepositInputs((prev) => ({ ...prev, [goal.id]: '' }));
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                          >
                            - برداشت
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* VERTICAL TIMELINE OF CURRENT DAY'S TRANSACTIONS BY HOUR (updatedAt)      */}
      {/* ======================================================================== */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CircularIcon name="clock" size="sm" color="#8b5cf6" />
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                تایم‌لاین عمودی تراکنش‌های روز جاری به تفکیک ساعت
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                فیلتر و دسته‌بندی ساعتی بر اساس زمان ثبت و بروزرسانی تراکنش (updatedAt)
              </p>
            </div>
          </div>

          {/* Simple Scope Filter based on updatedAt */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              {(
                [
                  { id: 'today', label: 'امروز (روز جاری)' },
                  { id: 'last24h', label: '۲۴ ساعت اخیر' },
                  { id: 'latestDay', label: 'آخرین روز فعال' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTimelineScope(item.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    timelineScope === item.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hour Period Filter Bar */}
        <div
          data-no-swipe="true"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80"
        >
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 ml-1">
              فیلتر ساعت (updatedAt):
            </span>
            {(
              [
                { id: 'all', label: 'همه ساعات (۰۰ تا ۲۴)' },
                { id: 'morning', label: 'صبح (۰۰ تا ۱۲)' },
                { id: 'afternoon', label: 'ظهر و عصر (۱۲ تا ۱۸)' },
                { id: 'night', label: 'شب (۱۸ تا ۲۴)' },
              ] as const
            ).map((hTab) => (
              <button
                key={hTab.id}
                type="button"
                onClick={() => setTimelineHourFilter(hTab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  timelineHourFilter === hTab.id
                    ? 'theme-bg text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {hTab.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
            {toPersianDigits(timelineTransactions.length)} تراکنش در{' '}
            {toPersianDigits(timelineHourGroups.length)} بازه ساعتی
          </span>
        </div>

        {/* Vertical Timeline Body */}
        {timelineHourGroups.length === 0 ? (
          <div className="py-7 px-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2.5">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {timelineScope === 'today'
                ? `در روز جاری (${formatJalaliReadable(todayJalaliStr)}) هنوز تراکنشی ثبت یا بروزرسانی نشده است.`
                : 'در این بازه ساعتی تراکنشی یافت نشد.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {timelineScope === 'today' && transactions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTimelineScope('latestDay')}
                  className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  مشاهده تایم‌لاین آخرین روز فعال ({formatJalaliReadable(latestTxJalaliDate)})
                </button>
              )}
              <button
                type="button"
                onClick={onAddTransaction}
                className="px-3.5 py-1.5 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer inline-flex items-center gap-1"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>ثبت تراکنش امروز</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative pr-4 sm:pr-6 mr-2 border-r-2 border-emerald-500/40 dark:border-emerald-500/30 space-y-5 py-1">
            {timelineHourGroups.map((group) => {
              const hourStr = toPersianDigits(String(group.hour).padStart(2, '0'));
              const nextHourStr = toPersianDigits(String((group.hour + 1) % 24).padStart(2, '0'));
              const hourTotalExpense = group.items
                .filter((i) => i.tx.type === 'expense')
                .reduce((s, i) => s + i.tx.amount, 0);
              const hourTotalIncome = group.items
                .filter((i) => i.tx.type === 'income')
                .reduce((s, i) => s + i.tx.amount, 0);

              return (
                <div key={group.hour} className="relative space-y-2.5">
                  {/* Timeline Node Dot on the Right Rail (RTL) */}
                  <div className="absolute -right-[23px] sm:-right-[31px] top-1 w-3.5 h-3.5 rounded-full theme-bg ring-4 ring-white dark:ring-slate-900 shadow-xs" />

                  {/* Hour Header Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-extrabold tabular-nums">
                      <Clock size={12} className="text-emerald-500" />
                      <span>
                        ساعت {hourStr}:۰۰ تا {nextHourStr}:۰۰
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        ({toPersianDigits(group.items.length)} مورد)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-extrabold tabular-nums">
                      {hourTotalIncome > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{formatMoney(hourTotalIncome)}
                        </span>
                      )}
                      {hourTotalExpense > 0 && (
                        <span className="text-rose-600 dark:text-rose-400">
                          -{formatMoney(hourTotalExpense)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Transactions inside this Hour Bucket */}
                  <div className="space-y-2">
                    {group.items.map(({ tx, timeLabel }) => {
                      const cat = categories.find((c) => c.id === tx.categoryId);
                      const sub = cat?.subCategories.find((s) => s.id === tx.subCategoryId);
                      const isCash = tx.cardId === 'cash';
                      const card = cards.find((c) => c.id === tx.cardId);

                      return (
                        <div
                          key={tx.id}
                          onClick={() => onEditTransaction(tx)}
                          className="p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 hover:border-emerald-500/40 transition-all flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <CircularIcon
                              name={cat?.icon || 'layers'}
                              color={cat?.color || '#10b981'}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                  {tx.title}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold tabular-nums shrink-0">
                                  {toPersianDigits(timeLabel)}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                <span>{cat?.name || 'سایر'}</span>
                                {sub && (
                                  <>
                                    <span>·</span>
                                    <span>{sub.name}</span>
                                  </>
                                )}
                                <span>·</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {isCash ? 'موجودی نقدی' : card?.title || 'کارت بانکی'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-left shrink-0 tabular-nums">
                            <div
                              className={`text-xs sm:text-sm font-black ${
                                tx.type === 'expense'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {tx.type === 'expense' ? '-' : '+'}
                              {formatMoney(tx.amount)}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {settings.currencyUnit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================================== */}
      {/* TRANSACTIONS BY CARDS & CASH BALANCE + SEARCH                            */}
      {/* ======================================================================== */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CircularIcon name="layers" size="sm" color="#10b981" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                مشاهده تراکنش‌ها به تفکیک کارت‌ها و موجودی نقدی ({toPersianDigits(filteredTransactions.length)} مورد)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                فیلتر بر اساس هر کارت بانکی، کیف پول نقدی، نوع تراکنش و جستجوی سریع
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در عنوان، دسته‌بندی..."
              className="w-full pr-3.5 pl-9 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <CircularIcon name="search" size="xs" color="#64748b" />
            </div>
          </div>
        </div>

        {/* Interactive Filter Controls: Type + Bank Card & Cash Balance (Isolated from Page Swipe!) */}
        <div
          data-no-swipe="true"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="space-y-2.5 pt-1"
        >
          {/* Row 1: Payment Source Selector (All + Cash Wallet + Individual Bank Cards) */}
          <div
            data-no-swipe="true"
            className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-x-auto max-w-full touch-pan-x"
          >
            <button
              type="button"
              onClick={() => setCardFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                cardFilter === 'all'
                  ? 'theme-bg text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              همه کارت‌ها و نقدی ({toPersianDigits(transactions.length)})
            </button>

            <button
              type="button"
              onClick={() => setCardFilter('cash')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                cardFilter === 'cash'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white/70 dark:bg-slate-900/60 text-emerald-700 dark:text-emerald-400 hover:bg-white'
              }`}
            >
              <Banknote size={13} />
              <span>
                موجودی نقدی ({toPersianDigits(transactions.filter((t) => t.cardId === 'cash').length)})
              </span>
            </button>

            {cards.map((c) => {
              const count = transactions.filter((t) => t.cardId === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCardFilter(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    cardFilter === c.id
                      ? 'theme-bg text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <BankLogoVector bankId={c.bankId} size={16} mono={isMonochrome} />
                  <span>
                    {c.title} ({toPersianDigits(count)})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Transaction Type Filter */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              {(
                [
                  { id: 'all', label: 'همه تراکنش‌ها' },
                  { id: 'expense', label: 'هزینه‌ها (خرج)' },
                  { id: 'income', label: 'درآمدها (ورودی)' },
                  { id: 'transfer', label: 'انتقال / عابربانک' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    typeFilter === tab.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {cardFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setCardFilter('all')}
                className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X size={13} />
                <span>نمایش همه حساب‌ها</span>
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Summary Banner when filtering by a specific Bank Card or Cash Balance */}
        {cardFilter !== 'all' && (() => {
          const isCashSelected = cardFilter === 'cash';
          const selectedCardObj = cards.find((c) => c.id === cardFilter);
          const sourceTitle = isCashSelected
            ? 'موجودی نقدی (کیف پول نقد)'
            : selectedCardObj?.title || 'کارت بانکی';
          const initBal = isCashSelected
            ? initialCashBalance
            : selectedCardObj?.initialBalance || 0;
          const incSum = transactions
            .filter(
              (t) =>
                (t.cardId === cardFilter && t.type === 'income') ||
                (t.toCardId === cardFilter && t.type === 'transfer')
            )
            .reduce((s, t) => s + t.amount, 0);
          const expSum = transactions
            .filter(
              (t) =>
                (t.cardId === cardFilter && t.type === 'expense') ||
                (t.cardId === cardFilter && t.type === 'transfer')
            )
            .reduce((s, t) => s + t.amount, 0);
          const liveBal = initBal + incSum - expSum;

          return (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
              <div>
                <span className="text-[10px] text-slate-400 block">حساب انتخاب‌شده</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{sourceTitle}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">مجموع ورودی (واریز)</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(incSum)} {settings.currencyUnit}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">مجموع خروجی (هزینه)</span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400">
                  -{formatMoney(expSum)} {settings.currencyUnit}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">مانده فعلی این حساب</span>
                <span className="font-black text-slate-900 dark:text-white">
                  {formatMoney(liveBal)} {settings.currencyUnit}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Transaction List */}
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="flex justify-center">
              <CircularIcon name="archive" size="lg" color="#94a3b8" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {cardFilter === 'cash'
                ? 'هنوز تراکنش نقدی ثبت نشده است'
                : cardFilter !== 'all'
                ? 'برای این کارت بانکی هنوز تراکنشی ثبت نشده است'
                : 'هنوز تراکنشی ثبت نشده است'}
            </p>
            <button
              type="button"
              onClick={onAddTransaction}
              className="px-4 py-2 rounded-xl theme-bg text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>ثبت تراکنش جدید</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredTransactions.map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoryId);
              const sub = cat?.subCategories.find((s) => s.id === tx.subCategoryId);
              const isCash = tx.cardId === 'cash';
              const card = cards.find((c) => c.id === tx.cardId);
              const bank = card ? IRANIAN_BANKS[card.bankId] : null;
              const txTags = tags.filter((t) => tx.tags.includes(t.id));

              return (
                <div
                  key={tx.id}
                  onClick={() => onEditTransaction(tx)}
                  className="py-3.5 px-2 -mx-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <CircularIcon
                      name={cat?.icon || 'layers'}
                      color={cat?.color || '#10b981'}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {tx.title}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {cat?.name || 'سایر'}
                        </span>
                        {sub && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{sub.name}</span>
                          </>
                        )}
                        {isCash ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              موجودی نقدی (کیف پول نقد)
                            </span>
                          </>
                        ) : (
                          card && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>
                                {card.title} {bank ? `(${bank.name})` : ''}
                              </span>
                            </>
                          )
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400 dark:text-slate-500 mt-1 tabular-nums">
                        <span>{formatJalaliReadable(tx.jalaliDate)}</span>
                        <span aria-hidden="true">·</span>
                        <span>ساعت {toPersianDigits(tx.time)}</span>
                        {txTags.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="theme-text font-medium">
                              {txTags.map((t) => `#${t.name}`).join(' ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side Amount & Delete Action */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-left">
                      <div
                        className={`text-sm sm:text-base font-extrabold tabular-nums ${
                          tx.type === 'expense'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {tx.type === 'expense' ? '-' : '+'}
                        {formatMoney(tx.amount)}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        {settings.currencyUnit}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTransaction(tx.id);
                      }}
                      title="حذف تراکنش"
                      className="opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <CircularIcon name="trash" size="xs" color="#ef4444" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
