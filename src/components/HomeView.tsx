import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  formatAmountToTomanWords,
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

  // Dedicated Modals for Reminders Hub & Savings Goals (opened via compact buttons)
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);

  // Reminder Hub & IOU (طلب و بدهی) states
  const [reminderTab, setReminderTab] = useState<'scheduled' | 'iou' | 'tagged'>('scheduled');
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [remTitle, setRemTitle] = useState('');
  const [remPerson, setRemPerson] = useState('');
  const [remAmountStr, setRemAmountStr] = useState('');
  const [remDueDate, setRemDueDate] = useState(() => getCurrentJalaliDateStr());
  const [remCategory, setRemCategory] = useState<DueReminder['category']>('installment');
  const [remRecurrence, setRemRecurrence] = useState<ReminderRecurrence>('monthly');
  const [remTotalInstallmentsStr, setRemTotalInstallmentsStr] = useState('12');
  const [expandedReminderIds, setExpandedReminderIds] = useState<Record<string, boolean>>({});

  // Dedicated IOU (ثبت طلب و بدهی دوستانه) quick form states
  const [isAddingIou, setIsAddingIou] = useState(false);
  const [iouType, setIouType] = useState<'receivable' | 'debt'>('receivable');
  const [iouPerson, setIouPerson] = useState('');
  const [iouTitle, setIouTitle] = useState('');
  const [iouAmountStr, setIouAmountStr] = useState('');
  const [iouDueDate, setIouDueDate] = useState(() => getCurrentJalaliDateStr());

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
      person: remPerson.trim() || state.userId || 'hootan',
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
    setRemPerson('');
    setRemAmountStr('');
    setRemTotalInstallmentsStr('12');
    setEditingReminderId(null);
    setIsAddingReminder(false);
  };

  const handleSaveIouForm = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(toEnglishDigits(iouAmountStr).replace(/\D/g, '') || '0', 10);
    if ((!iouTitle.trim() && !iouPerson.trim()) || amt <= 0) return;
    const cleanPerson = iouPerson.trim();
    const cleanReason = iouTitle.trim();
    const combinedTitle =
      cleanPerson && cleanReason
        ? `${iouType === 'receivable' ? `طلب از ${cleanPerson}` : `بدهی به ${cleanPerson}`} (${cleanReason})`
        : cleanReason ||
          (iouType === 'receivable' ? `طلب از ${cleanPerson}` : `بدهی به ${cleanPerson}`);

    onAddReminder({
      title: combinedTitle,
      amount: amt,
      dueDate: iouDueDate.trim() || getCurrentJalaliDateStr(),
      category: iouType,
      person: cleanPerson || undefined,
      isPaid: false,
      recurrence: 'once',
      paidInstallments: 0,
    });

    setIouPerson('');
    setIouTitle('');
    setIouAmountStr('');
    setIsAddingIou(false);
  };

  const iouReminders = reminders.filter(
    (r) => r.category === 'debt' || r.category === 'receivable'
  );
  const totalActiveReceivables = iouReminders
    .filter((r) => !r.isPaid && r.category === 'receivable')
    .reduce((s, r) => s + r.amount, 0);
  const totalActiveDebts = iouReminders
    .filter((r) => !r.isPaid && r.category === 'debt')
    .reduce((s, r) => s + r.amount, 0);

  const handleStartEditReminder = (rem: DueReminder) => {
    setEditingReminderId(rem.id);
    setRemTitle(rem.title);
    setRemPerson(rem.person || '');
    setRemAmountStr(String(rem.amount));
    setRemDueDate(rem.dueDate);
    setRemCategory(rem.category);
    setRemRecurrence(rem.recurrence || 'once');
    setRemTotalInstallmentsStr(rem.totalInstallments ? String(rem.totalInstallments) : '');
    setReminderTab('scheduled');
    setIsAddingReminder(true);
  };

  return (
    <div className="space-y-5 pb-8">
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
                {parseInt(toEnglishDigits(cashInputStr).replace(/\D/g, '') || '0', 10) > 0 && (
                  <p className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                    معادل به تومان:{' '}
                    {formatAmountToTomanWords(
                      parseInt(toEnglishDigits(cashInputStr).replace(/\D/g, '') || '0', 10),
                      settings.currencyUnit
                    )}
                  </p>
                )}
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

      {/* COMPACT 3-BUTTON LAUNCHER FOR INSTALLMENTS, DEBT/RECEIVABLE (IOU), & SAVINGS GOALS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Button 1: Open Reminders & Installments Modal */}
        <button
          type="button"
          onClick={() => {
            setReminderTab('scheduled');
            setIsRemindersModalOpen(true);
          }}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/50 transition-all flex items-center justify-between gap-2.5 cursor-pointer text-right shadow-2xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CircularIcon name="clock" size="sm" color="#f59e0b" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  یادآور اقساط و اجاره
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-black tabular-nums shrink-0">
                  {toPersianDigits(reminders.filter((r) => !r.isPaid).length)} فعال
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 tabular-nums">
                {nextUpcomingReminder
                  ? `نزدیک‌ترین: ${nextUpcomingReminder.title}`
                  : 'مشاهده و تیک زدن اقساط'}
              </p>
            </div>
          </div>
          <ArrowLeft size={15} className="text-slate-400 shrink-0" />
        </button>

        {/* Button 2: Open Dedicated Debt & Receivable (ثبت طلب و بدهی) Tab */}
        <button
          type="button"
          onClick={() => {
            setReminderTab('iou');
            setIsRemindersModalOpen(true);
          }}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-sky-500/50 transition-all flex items-center justify-between gap-2.5 cursor-pointer text-right shadow-2xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CircularIcon name="refresh" size="sm" color="#0ea5e9" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  ثبت طلب و بدهی (قرض‌ها)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] font-black tabular-nums shrink-0">
                  {toPersianDigits(iouReminders.filter((r) => !r.isPaid).length)} مورد
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 tabular-nums">
                {totalActiveReceivables > 0 || totalActiveDebts > 0
                  ? `طلب: ${maskMoney(totalActiveReceivables)} · بدهی: ${maskMoney(
                      totalActiveDebts
                    )}`
                  : 'کی به من بدهکاره / به کی بدهکارم'}
              </p>
            </div>
          </div>
          <ArrowLeft size={15} className="text-slate-400 shrink-0" />
        </button>

        {/* Button 3: Open Savings Goals & Vaults Modal */}
        <button
          type="button"
          onClick={() => setIsGoalsModalOpen(true)}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50 transition-all flex items-center justify-between gap-2.5 cursor-pointer text-right shadow-2xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Target size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  قلک‌ها و اهداف پس‌انداز
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-black tabular-nums shrink-0">
                  {toPersianDigits(savingsGoals.length)} هدف
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 tabular-nums">
                {totalSavedInGoals > 0
                  ? `پس‌انداز: ${maskMoney(totalSavedInGoals)} ${settings.currencyUnit}`
                  : 'مدیریت اهداف پس‌انداز و طلا'}
              </p>
            </div>
          </div>
          <ArrowLeft size={15} className="text-slate-400 shrink-0" />
        </button>
      </div>

      {/* ======================================================================== */}
      {/* MODAL 1: REMINDERS, INSTALLMENTS & IOU (طلب و بدهی) FULL VIEW             */}
      {/* ======================================================================== */}
      {isRemindersModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-no-swipe="true"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
          >
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 shadow-2xl text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <CircularIcon name="clock" size="sm" color="#f59e0b" />
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                      یادآور اقساط، طلب‌ها و بدهی‌های شخصی
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      مدیریت اقساط ماهانه + ثبت طلب و بدهی با تسویه خودکار روی کارت یا نقدی
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRemindersModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <X size={14} />
                  <span>بستن</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setReminderTab('scheduled')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                      reminderTab === 'scheduled'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    اقساط و تعهدات ({toPersianDigits(reminders.filter((r) => !r.isPaid).length)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderTab('iou')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-colors whitespace-nowrap ${
                      reminderTab === 'iou'
                        ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    طلب و بدهی ({toPersianDigits(iouReminders.filter((r) => !r.isPaid).length)})
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
                    تگ‌های #بدهی و #طلب ({toPersianDigits(debtReceivableTransactions.length)})
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
                        setRemPerson('');
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

                {reminderTab === 'iou' && (
                  <button
                    type="button"
                    onClick={() => setIsAddingIou((prev) => !prev)}
                    className="px-3 py-2 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer flex items-center gap-1 whitespace-nowrap"
                  >
                    {isAddingIou ? (
                      <>
                        <X size={14} />
                        <span>بستن فرم</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} strokeWidth={2.5} />
                        <span>ثبت طلب یا بدهی جدید</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* TAB 2: DEDICATED DEBT & RECEIVABLE (طلب و بدهی) TRACKER */}
              {reminderTab === 'iou' && (
                <div className="space-y-4">
                  {/* Summary Cards: Total Receivables vs Total Debts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">
                          مجموع طلب‌های من (بستانکاری)
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          مبالغی که دیگران به شما بدهکارند
                        </span>
                      </div>
                      <div className="text-left tabular-nums">
                        <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
                          +{maskMoney(totalActiveReceivables)}
                        </div>
                        <span className="text-[10px] text-slate-400">{settings.currencyUnit}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 block">
                          مجموع بدهی‌های من (بدهکاری)
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          مبالغی که شما به دیگران بدهکارید
                        </span>
                      </div>
                      <div className="text-left tabular-nums">
                        <div className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400">
                          -{maskMoney(totalActiveDebts)}
                        </div>
                        <span className="text-[10px] text-slate-400">{settings.currencyUnit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Add New IOU Form */}
                  {isAddingIou && (
                    <form
                      onSubmit={handleSaveIouForm}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3.5"
                    >
                      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={() => setIouType('receivable')}
                          className={`py-2 px-3 rounded-lg text-xs font-extrabold cursor-pointer transition-all ${
                            iouType === 'receivable'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          طلب دارم (به من بدهکارند)
                        </button>
                        <button
                          type="button"
                          onClick={() => setIouType('debt')}
                          className={`py-2 px-3 rounded-lg text-xs font-extrabold cursor-pointer transition-all ${
                            iouType === 'debt'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          بدهی دارم (من بدهکارم)
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            {iouType === 'receivable'
                              ? 'نام بدهکار (چه کسی به شما بدهکار است؟)'
                              : 'نام طلبکار (به چه کسی بدهکارید؟)'}
                          </label>
                          <input
                            type="text"
                            value={iouPerson}
                            onChange={(e) => setIouPerson(e.target.value)}
                            placeholder="مثلاً: علی، محمد، برادر، همکار..."
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            بابت / علت طلب یا بدهی
                          </label>
                          <input
                            type="text"
                            value={iouTitle}
                            onChange={(e) => setIouTitle(e.target.value)}
                            placeholder="مثلاً: قرض دستی، سهم شام، خرید مشترک..."
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            مبلغ ({settings.currencyUnit})
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={
                              iouAmountStr
                                ? formatMoney(
                                    parseInt(
                                      toEnglishDigits(iouAmountStr).replace(/\D/g, '') || '0',
                                      10
                                    )
                                  )
                                : ''
                            }
                            onChange={(e) =>
                              setIouAmountStr(toEnglishDigits(e.target.value).replace(/\D/g, ''))
                            }
                            placeholder="مثلاً: ۵،۰۰۰،۰۰۰"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold tabular-nums"
                          />
                          {parseInt(toEnglishDigits(iouAmountStr).replace(/\D/g, '') || '0', 10) >
                            0 && (
                            <p className="mt-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              معادل به تومان:{' '}
                              {formatAmountToTomanWords(
                                parseInt(
                                  toEnglishDigits(iouAmountStr).replace(/\D/g, '') || '0',
                                  10
                                ),
                                settings.currencyUnit
                              )}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            موعد تسویه / یادآوری
                          </label>
                          <JalaliDateInput
                            value={iouDueDate}
                            onChange={(d) => setIouDueDate(d)}
                            placeholder="انتخاب تاریخ تسویه"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className={`w-full py-2.5 rounded-xl text-white text-xs font-extrabold cursor-pointer shadow-xs ${
                          iouType === 'receivable' ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      >
                        {iouType === 'receivable'
                          ? 'ثبت در لیست طلب‌های من'
                          : 'ثبت در لیست بدهی‌های من'}
                      </button>
                    </form>
                  )}

                  {/* List of IOU Items */}
                  {iouReminders.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                      <p>هنوز هیچ طلب یا بدهی شخصی ثبت نشده است.</p>
                      <button
                        type="button"
                        onClick={() => setIsAddingIou(true)}
                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>ثبت اولین طلب یا بدهی</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {iouReminders.map((rem) => {
                        const isReceivable = rem.category === 'receivable';
                        const cardStyle = rem.isPaid
                          ? 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70'
                          : isReceivable
                          ? 'bg-emerald-50/85 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/50 border-r-4 border-r-emerald-500'
                          : 'bg-rose-50/85 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/50 border-r-4 border-r-rose-500';

                        return (
                          <div
                            key={rem.id}
                            className={`p-3.5 rounded-2xl border space-y-2.5 transition-all ${cardStyle}`}
                          >
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <CircularIcon
                                  name={
                                    rem.isPaid
                                      ? 'check'
                                      : isReceivable
                                      ? 'arrow-down'
                                      : 'arrow-up'
                                  }
                                  color={
                                    rem.isPaid
                                      ? '#64748b'
                                      : isReceivable
                                      ? '#10b981'
                                      : '#f43f5e'
                                  }
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4
                                      className={`text-xs sm:text-sm font-extrabold truncate ${
                                        rem.isPaid
                                          ? 'line-through text-slate-400'
                                          : 'text-slate-900 dark:text-white'
                                      }`}
                                    >
                                      {rem.title}
                                    </h4>
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded-lg font-extrabold ${
                                        isReceivable
                                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                      }`}
                                    >
                                      {isReceivable ? 'طلب (بستانکار)' : 'بدهی (بدهکار)'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 tabular-nums">
                                    موعد: {formatJalaliReadable(rem.dueDate)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="text-left tabular-nums">
                                  <div
                                    className={`text-xs sm:text-sm font-black ${
                                      isReceivable
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-rose-600 dark:text-rose-400'
                                    }`}
                                  >
                                    {isReceivable ? '+' : '-'}
                                    {formatMoney(rem.amount)}
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    {settings.currencyUnit}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onDeleteReminder(rem.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                                  title="حذف"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Settlement Action Row */}
                            <div className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                              {!rem.isPaid ? (
                                <>
                                  <select
                                    value={installmentPaySourceMap[rem.id] || 'cash'}
                                    onChange={(e) =>
                                      setInstallmentPaySourceMap((prev) => ({
                                        ...prev,
                                        [rem.id]: e.target.value,
                                      }))
                                    }
                                    className="flex-1 min-w-[160px] px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200"
                                  >
                                    <option value="cash">
                                      {isReceivable
                                        ? 'واریز به موجودی نقدی (کیف پول نقد)'
                                        : 'کسر از موجودی نقدی (کیف پول نقد)'}
                                    </option>
                                    {cards.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {isReceivable
                                          ? `واریز به کارت ${c.title}`
                                          : `کسر از کارت ${c.title}`}
                                      </option>
                                    ))}
                                    <option value="none">
                                      فقط تیک تسویه (بدون تغییر موجودی کارت/نقد)
                                    </option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const chosen =
                                        installmentPaySourceMap[rem.id] || 'cash';
                                      onToggleReminderPaid(
                                        rem.id,
                                        chosen !== 'none' ? chosen : undefined
                                      );
                                    }}
                                    className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-extrabold cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                                      isReceivable
                                        ? 'bg-emerald-600 hover:bg-emerald-500'
                                        : 'bg-rose-600 hover:bg-rose-500'
                                    }`}
                                  >
                                    <Check size={13} strokeWidth={2.6} />
                                    <span>
                                      {isReceivable
                                        ? 'دریافت شد (تسویه طلب)'
                                        : 'پرداخت شد (تسویه بدهی)'}
                                    </span>
                                  </button>
                                </>
                              ) : (
                                <div className="w-full flex items-center justify-between text-xs">
                                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                    تسویه شده است
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onToggleReminderPaid(rem.id)}
                                    className="text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <RotateCcw size={12} />
                                    <span>برگرداندن به حالت تسویه‌نشده</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {reminderTab === 'tagged' && (
                <div>
                  {debtReceivableTransactions.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                      <p>هیچ تراکنشی با تگ «#بدهی» یا «#طلب» ثبت نشده است.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRemindersModalOpen(false);
                          onAddTransaction();
                        }}
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
                            onClick={() => {
                              setIsRemindersModalOpen(false);
                              onEditTransaction(tx);
                            }}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                              isReceivable
                                ? 'bg-emerald-50/75 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-800/50'
                                : 'bg-rose-50/75 dark:bg-rose-950/25 border-rose-200/80 dark:border-rose-800/50'
                            }`}
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
                          {parseInt(toEnglishDigits(remAmountStr).replace(/\D/g, '') || '0', 10) >
                            0 && (
                            <p className="mt-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              معادل به تومان:{' '}
                              {formatAmountToTomanWords(
                                parseInt(
                                  toEnglishDigits(remAmountStr).replace(/\D/g, '') || '0',
                                  10
                                ),
                                settings.currencyUnit
                              )}
                            </p>
                          )}
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
                              تعداد کل اقساط / دفعات
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
                              placeholder="مثلاً ۱۲ یا ۲۴"
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
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    isRecurring && !rem.isPaid
                                      ? onStepReminderInstallment(rem.id, 1)
                                      : onToggleReminderPaid(rem.id)
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
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 cursor-pointer"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteReminder(rem.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>

                            {isRecurring ? (
                              <div className="rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 overflow-hidden">
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

                                {expandedReminderIds[rem.id] && (
                                  <div className="px-3 pb-3 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                                    {totalCount > 0 && (
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
                                              مبلغ باقی‌مانده:{' '}
                                              {formatMoney(
                                                remainingCount * rem.amount,
                                                true,
                                                settings.currencyUnit
                                              )}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {totalCount > 0 && totalCount <= 36 && (
                                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
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
          </div>,
          document.body
        )}

      {/* ======================================================================== */}
      {/* MODAL 2: SAVINGS GOALS & VAULTS FULL VIEW                                */}
      {/* ======================================================================== */}
      {isGoalsModalOpen &&
        onSaveSavingsGoal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-no-swipe="true"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 shadow-2xl text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Target size={19} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                      قلک‌ها و اهداف پس‌انداز ({toPersianDigits(savingsGoals.length)} هدف)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      جدا کردن مبالغ پس‌انداز (سفر، خرید طلا، صندوق اضطراری) از موجودی روزمره
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGoalsModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <X size={14} />
                  <span>بستن</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                  مجموع پس‌انداز قلک‌ها: {maskMoney(totalSavedInGoals)} {settings.currencyUnit}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingGoal((prev) => !prev)}
                  className="px-3.5 py-2 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer flex items-center gap-1"
                >
                  {isAddingGoal ? (
                    <>
                      <X size={14} />
                      <span>بستن فرم</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} strokeWidth={2.5} />
                      <span>ساخت قلک جدید</span>
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
                      placeholder="مثلاً: خرید طلا، سفر..."
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
                    {parseInt(toEnglishDigits(goalTargetStr).replace(/\D/g, '') || '0', 10) > 0 && (
                      <p className="mt-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        معادل به تومان:{' '}
                        {formatAmountToTomanWords(
                          parseInt(toEnglishDigits(goalTargetStr).replace(/\D/g, '') || '0', 10),
                          settings.currencyUnit
                        )}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      پس‌انداز فعلی ({settings.currencyUnit})
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
                    {parseInt(toEnglishDigits(goalInitialSavedStr).replace(/\D/g, '') || '0', 10) >
                      0 && (
                      <p className="mt-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        معادل به تومان:{' '}
                        {formatAmountToTomanWords(
                          parseInt(
                            toEnglishDigits(goalInitialSavedStr).replace(/\D/g, '') || '0',
                            10
                          ),
                          settings.currencyUnit
                        )}
                      </p>
                    )}
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
                <div className="py-6 text-center text-xs text-slate-400">
                  هنوز قلک یا هدف پس‌اندازی نساخته‌اید.
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
                              placeholder={`مبلغ (${settings.currencyUnit})...`}
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
                              + واریز
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
          </div>,
          document.body
        )}

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
          <div className="space-y-2.5">
            {filteredTransactions.map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoryId);
              const sub = cat?.subCategories.find((s) => s.id === tx.subCategoryId);
              const isCash = tx.cardId === 'cash';
              const card = cards.find((c) => c.id === tx.cardId);
              const bank = card ? IRANIAN_BANKS[card.bankId] : null;
              const txTags = tags.filter((t) => tx.tags.includes(t.id));

              const txRowColorClass =
                tx.type === 'expense'
                  ? 'bg-rose-50/75 dark:bg-rose-950/25 hover:bg-rose-100/80 dark:hover:bg-rose-900/35 border border-rose-200/80 dark:border-rose-800/50'
                  : tx.type === 'income'
                  ? 'bg-emerald-50/75 dark:bg-emerald-950/25 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/35 border border-emerald-200/80 dark:border-emerald-800/50'
                  : 'bg-sky-50/75 dark:bg-sky-950/25 hover:bg-sky-100/80 dark:hover:bg-sky-900/35 border border-sky-200/80 dark:border-sky-800/50';

              return (
                <div
                  key={tx.id}
                  onClick={() => onEditTransaction(tx)}
                  className={`p-3.5 rounded-2xl transition-all flex items-center justify-between gap-3 cursor-pointer group ${txRowColorClass}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <CircularIcon
                      name={cat?.icon || 'layers'}
                      color={
                        tx.type === 'expense'
                          ? '#ef4444'
                          : tx.type === 'income'
                          ? '#10b981'
                          : '#0ea5e9'
                      }
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {tx.title}
                        </h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold shrink-0 ${
                            tx.type === 'expense'
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                              : tx.type === 'income'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                          }`}
                        >
                          {tx.type === 'expense'
                            ? 'هزینه'
                            : tx.type === 'income'
                            ? 'درآمد'
                            : 'انتقال'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-600 dark:text-slate-300 mt-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
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

                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
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
                            : tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-sky-600 dark:text-sky-400'
                        }`}
                      >
                        {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                        {formatMoney(tx.amount)}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
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
                      className="opacity-75 group-hover:opacity-100 transition-opacity cursor-pointer"
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
