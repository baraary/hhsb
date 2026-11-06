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
} from 'lucide-react';
import {
  AppState,
  Transaction,
  DueReminder,
  ReminderRecurrence,
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
  onToggleReminderPaid: (id: string) => void;
  onStepReminderInstallment: (id: string, delta: 1 | -1) => void;
  onDeleteReminder: (id: string) => void;
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
}) => {
  const { transactions, cards, categories, tags, reminders = [], settings } = state;
  const userName = settings.userName || settings.hootanName || 'کاربر';

  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [cardFilter, setCardFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const isMonochrome = settings.colorTheme === 'monochrome';

  // Calculate each card's real current balance (initial + card incomes - card expenses)
  const getCardCurrentBalance = (cardId: string, initialBalance: number) => {
    const cInc = transactions
      .filter((t) => t.cardId === cardId && t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const cExp = transactions
      .filter((t) => t.cardId === cardId && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    return initialBalance + cInc - cExp;
  };

  const totalNetWorth = cards.reduce(
    (sum, c) => sum + getCardCurrentBalance(c.id, c.initialBalance),
    0
  );

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
      if (cardFilter !== 'all' && tx.cardId !== cardFilter) return false;
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
      {/* Top Hero Balance & Personal Cards Summary Grid */}
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
                  موجودی کل کیف پول {userName} ({toPersianDigits(cards.length)} کارت)
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-white/80">
                  دوره فعلی · {formatMonthKeyReadable(latestMonth)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
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
            <div className="flex items-baseline gap-1.5">
              <h2 className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight leading-none">
                {formatMoney(totalNetWorth)}
              </h2>
              <span className="text-xs font-medium text-white/85">
                {settings.currencyUnit}
              </span>
            </div>

            {/* Budget Progress Bar */}
            {settings.monthlyTotalBudget > 0 && (
              <div className="w-full sm:max-w-[230px]">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-white/90 mb-1">
                  <span>مصرف بودجه</span>
                  <span className="tabular-nums font-bold">
                    {toPersianDigits(budgetPercent)}٪ از {formatMoney(settings.monthlyTotalBudget)}
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
                  +{formatMoney(totalIncome)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CircularIcon name="arrow-up" size="xs" variant="glass" />
              <div className="min-w-0">
                <span className="text-[10px] text-white/75 block leading-tight">کل هزینه‌ها / خرج</span>
                <span className="text-xs sm:text-sm font-extrabold tabular-nums text-rose-100">
                  -{formatMoney(totalExpense)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Bank Cards Live Balances Summary */}
        <div className="lg:col-span-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircularIcon name="credit-card" size="xs" color="#0ea5e9" />
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  موجودی کارت‌های بانکی {userName}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  سهم هر کارت از کل موجودی کیف پول شما
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

          {cards.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              هنوز کارتی ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-3">
              {cards.slice(0, 4).map((c) => {
                const bal = getCardCurrentBalance(c.id, c.initialBalance);
                const bank = IRANIAN_BANKS[c.bankId] || IRANIAN_BANKS.other;
                const pct =
                  totalNetWorth > 0
                    ? Math.max(0, Math.min(100, Math.round((bal / totalNetWorth) * 100)))
                    : 0;
                return (
                  <div key={c.id} className="space-y-1">
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
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Card Logos Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center -space-x-2 space-x-reverse">
              {cards.slice(0, 6).map((c) => (
                <BankLogoVector
                  key={c.id}
                  bankId={c.bankId}
                  size={28}
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
              <span>همه کارت‌ها ({toPersianDigits(cards.length)})</span>
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

                      {/* Recurring Installment Tracker & Check-Off Section */}
                      {isRecurring ? (
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
                          {/* Paid vs Remaining Counter Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Check size={13} strokeWidth={2.6} />
                                <span>
                                  پرداخت‌شده: {toPersianDigits(paidCount)}{' '}
                                  {totalCount > 0 ? `از ${toPersianDigits(totalCount)}` : 'نوبت'}
                                </span>
                              </span>

                              {remainingCount !== null ? (
                                <span className="font-extrabold text-amber-600 dark:text-amber-400">
                                  · مانده: {toPersianDigits(remainingCount)} قسط
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditReminder(rem)}
                                  className="text-[11px] font-bold text-sky-500 hover:underline cursor-pointer"
                                >
                                  + تعیین تعداد کل اقساط
                                </button>
                              )}
                            </div>

                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                              {rem.isPaid ? (
                                <>
                                  <Award size={13} className="text-emerald-500" />
                                  <span>همه اقساط پرداخت شد</span>
                                </>
                              ) : (
                                <span>سررسید بعدی: {formatJalaliReadable(rem.dueDate)}</span>
                              )}
                            </span>
                          </div>

                          {/* Progress bar + Remaining Money if totalInstallments is set */}
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
                          )}

                          {/* Interactive Checkboxes for Installments (when totalCount <= 36) */}
                          {totalCount > 0 && totalCount <= 36 && (
                            <div
                              data-no-swipe="true"
                              onTouchStart={(e) => e.stopPropagation()}
                              onTouchMove={(e) => e.stopPropagation()}
                              onTouchEnd={(e) => e.stopPropagation()}
                              className="flex flex-wrap items-center gap-1.5 pt-1"
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

                          {/* Action Buttons to Check Off Next Payment or Undo */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            {!rem.isPaid ? (
                              <button
                                type="button"
                                onClick={() => onStepReminderInstallment(rem.id, 1)}
                                className="flex-1 py-2 px-3 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs hover:opacity-95"
                              >
                                <Check size={14} strokeWidth={2.6} />
                                <span>
                                  تیک زدن واریز قسط {toPersianDigits(paidCount + 1)}
                                  {remainingCount !== null && remainingCount > 0
                                    ? ` (مانده بعد از این: ${toPersianDigits(
                                        remainingCount - 1
                                      )} قسط)`
                                    : ''}
                                </span>
                              </button>
                            ) : (
                              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Check size={14} strokeWidth={2.6} />
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
                      ) : (
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span className="tabular-nums">
                            سررسید: {formatJalaliReadable(rem.dueDate)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onToggleReminderPaid(rem.id)}
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
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter & Search Bar for Transactions */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CircularIcon name="layers" size="sm" color="#10b981" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                تراکنش‌های اخیر ({toPersianDigits(filteredTransactions.length)} مورد)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                فیلتر بر اساس نوع تراکنش، کارت بانکی و جستجوی سریع
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

        {/* Interactive Filter Controls: Type + Bank Card (Isolated from Page Swipe!) */}
        <div
          data-no-swipe="true"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="flex flex-wrap items-center justify-between gap-2 pt-1"
        >
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            {(
              [
                { id: 'all', label: 'همه تراکنش‌ها' },
                { id: 'expense', label: 'هزینه‌ها (خرج)' },
                { id: 'income', label: 'درآمدها (ورودی)' },
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

          {/* Bank Card Filter */}
          {cards.length > 1 && (
            <div
              data-no-swipe="true"
              className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-x-auto max-w-full touch-pan-x"
            >
              <button
                type="button"
                onClick={() => setCardFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  cardFilter === 'all'
                    ? 'theme-bg text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                همه کارت‌ها
              </button>
              {cards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCardFilter(c.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    cardFilter === c.id
                      ? 'theme-bg text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Transaction List */}
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="flex justify-center">
              <CircularIcon name="archive" size="lg" color="#94a3b8" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              هنوز تراکنشی ثبت نشده است
            </p>
            <button
              type="button"
              onClick={onAddTransaction}
              className="px-4 py-2 rounded-xl theme-bg text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>ثبت اولین تراکنش</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredTransactions.map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoryId);
              const sub = cat?.subCategories.find((s) => s.id === tx.subCategoryId);
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
                        {card && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              {card.title} {bank ? `(${bank.name})` : ''}
                            </span>
                          </>
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
