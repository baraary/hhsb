import React, { useState, useEffect, useMemo } from 'react';
import { Zap, ArrowLeftRight, Trash2, Copy } from 'lucide-react';
import {
  AppState,
  Transaction,
  TransactionType,
} from '../types';
import {
  toEnglishDigits,
  formatMoney,
  formatAmountToTomanWords,
  getCurrentTimeStr,
  getCurrentJalaliDateStr,
} from '../utils/persian';
import { CircularIcon } from './CircularIcon';
import { JalaliDateTimePicker } from './JalaliDateTimePicker';
import { BankLogoVector, IRANIAN_BANKS } from '../utils/iranianBanks';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onSave: (tx: Omit<Transaction, 'id' | 'createdAt'>, existingId?: string) => void;
  onDelete?: (id: string) => void;
  editingTransaction?: Transaction | null;
}

interface QuickTemplate {
  id: string;
  label: string;
  title: string;
  type: TransactionType;
  categoryMatch: string;
  subCategoryMatch?: string;
}

const DEFAULT_QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: 'tpl_supermarket',
    label: 'سوپرمارکت',
    title: 'خرید سوپرمارکت و لبنیات',
    type: 'expense',
    categoryMatch: 'خوراک',
    subCategoryMatch: 'سوپرمارکت',
  },
  {
    id: 'tpl_bakery',
    label: 'نانوایی',
    title: 'خرید نان تازه',
    type: 'expense',
    categoryMatch: 'خوراک',
    subCategoryMatch: 'نانوایی',
  },
  {
    id: 'tpl_snapp',
    label: 'اسنپ / تاکسی',
    title: 'کرایه اسنپ و تاکسی',
    type: 'expense',
    categoryMatch: 'حمل',
    subCategoryMatch: 'اسنپ',
  },
  {
    id: 'tpl_cafe',
    label: 'کافه و رستوران',
    title: 'کافه و رستوران',
    type: 'expense',
    categoryMatch: 'خوراک',
    subCategoryMatch: 'رستوران',
  },
  {
    id: 'tpl_fruit',
    label: 'میوه و پروتئینی',
    title: 'خرید میوه و پروتئینی',
    type: 'expense',
    categoryMatch: 'خوراک',
    subCategoryMatch: 'میوه',
  },
  {
    id: 'tpl_internet',
    label: 'شارژ و اینترنت',
    title: 'خرید بسته اینترنت و شارژ',
    type: 'expense',
    categoryMatch: 'قبوض',
    subCategoryMatch: 'اینترنت',
  },
  {
    id: 'tpl_atm_cash',
    label: 'برداشت نقد عابربانک',
    title: 'برداشت وجه نقد از عابربانک',
    type: 'transfer',
    categoryMatch: '',
  },
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  state,
  onSave,
  onDelete,
  editingTransaction,
}) => {
  const { categories, tags, cards, settings } = state;

  const [type, setType] = useState<TransactionType>('expense');
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [cardId, setCardId] = useState('');
  const [toCardId, setToCardId] = useState('cash');
  const [jalaliDate, setJalaliDate] = useState(() => getCurrentJalaliDateStr());
  const [time, setTime] = useState('19:30');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const filteredCategories = categories.filter(
    (c) => c.type === (type === 'transfer' ? 'expense' : type)
  );
  const activeCategory =
    filteredCategories.find((c) => c.id === categoryId) || filteredCategories[0];

  // Derive top user frequent transaction templates dynamically
  const userFrequentTemplates = useMemo(() => {
    const counts = new Map<string, { count: number; tx: Transaction }>();
    for (const tx of state.transactions) {
      if (tx.type === 'transfer') continue;
      const key = tx.title.trim();
      if (!key) continue;
      const prev = counts.get(key);
      if (prev) {
        prev.count += 1;
      } else {
        counts.set(key, { count: 1, tx });
      }
    }
    return Array.from(counts.values())
      .filter((item) => item.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((item) => item.tx);
  }, [state.transactions]);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setTitle(editingTransaction.title);
      setAmountStr(String(editingTransaction.amount));
      setCategoryId(editingTransaction.categoryId);
      setSubCategoryId(editingTransaction.subCategoryId);
      setSelectedTags(editingTransaction.tags);
      setCardId(editingTransaction.cardId);
      setToCardId(editingTransaction.toCardId || 'cash');
      setJalaliDate(editingTransaction.jalaliDate);
      setTime(editingTransaction.time);
      setNote(editingTransaction.note || '');
      setError('');
    } else {
      const defaultCat = categories.find((c) => c.type === 'expense') || categories[0];
      const defaultCard = cards.find((c) => c.isDefault) || cards[0];
      setType('expense');
      setTitle('');
      setAmountStr('');
      setCategoryId(defaultCat?.id || '');
      setSubCategoryId(defaultCat?.subCategories[0]?.id || '');
      setSelectedTags([]);
      setCardId(defaultCard?.id || 'cash');
      setToCardId('cash');
      setJalaliDate(getCurrentJalaliDateStr());
      setTime(getCurrentTimeStr());
      setNote('');
      setError('');
    }
  }, [editingTransaction, isOpen, categories, cards]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'transfer') {
      const firstCard = cards[0]?.id || 'cash';
      setCardId(firstCard);
      setToCardId('cash');
      if (!title.trim()) {
        setTitle('انتقال وجه / برداشت نقد');
      }
      return;
    }
    const firstCat = categories.find((c) => c.type === newType);
    if (firstCat) {
      setCategoryId(firstCat.id);
      setSubCategoryId(firstCat.subCategories[0]?.id || '');
    }
  };

  const handleApplyQuickTemplate = (tpl: QuickTemplate) => {
    setType(tpl.type);
    setTitle(tpl.title);
    setError('');
    if (tpl.type === 'transfer') {
      setCardId(cards[0]?.id || 'cash');
      setToCardId('cash');
      return;
    }
    const matchedCat =
      categories.find(
        (c) => c.type === tpl.type && c.name.includes(tpl.categoryMatch)
      ) ||
      categories.find((c) => c.type === tpl.type) ||
      categories[0];

    if (matchedCat) {
      setCategoryId(matchedCat.id);
      const matchedSub = tpl.subCategoryMatch
        ? matchedCat.subCategories.find((s) =>
            s.name.includes(tpl.subCategoryMatch!)
          )
        : matchedCat.subCategories[0];
      setSubCategoryId(matchedSub?.id || matchedCat.subCategories[0]?.id || '');
    }
  };

  const handleApplyUserTxTemplate = (tx: Transaction) => {
    setType(tx.type);
    setTitle(tx.title);
    setCategoryId(tx.categoryId);
    setSubCategoryId(tx.subCategoryId);
    setCardId(tx.cardId);
    setSelectedTags(tx.tags || []);
    setError('');
  };

  const handleCategorySelect = (catId: string) => {
    setCategoryId(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat && cat.subCategories.length > 0) {
      setSubCategoryId(cat.subCategories[0].id);
    } else {
      setSubCategoryId('');
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleAmountChange = (val: string) => {
    const clean = toEnglishDigits(val).replace(/\D/g, '');
    setAmountStr(clean);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseInt(amountStr, 10);
    if (!title.trim()) {
      setError('لطفاً عنوان تراکنش را وارد کنید.');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setError('لطفاً مبلغ معتبر وارد کنید.');
      return;
    }
    if (!cardId) {
      setError('لطفاً کارت بانکی یا موجودی نقدی را انتخاب کنید.');
      return;
    }
    if (type === 'transfer' && cardId === toCardId) {
      setError('حساب مبدأ و مقصد در انتقال وجه نمی‌توانند یکسان باشند.');
      return;
    }

    const activeUserId = state.userId || 'hootan';
    onSave(
      {
        title: title.trim(),
        amount: numericAmount,
        type,
        categoryId: activeCategory?.id || categoryId,
        subCategoryId: subCategoryId || activeCategory?.subCategories[0]?.id || '',
        tags: selectedTags,
        spentBy: activeUserId,
        recordedBy: activeUserId,
        cardId,
        toCardId: type === 'transfer' ? toCardId : undefined,
        jalaliDate,
        time,
        note: note.trim(),
      },
      editingTransaction?.id
    );
    onClose();
  };

  if (!isOpen) return null;

  const numericAmountPreview = parseInt(amountStr || '0', 10);

  // Calculate live cash balance for display inside the modal (accounting for transfers!)
  const initialCash = settings.initialCashBalance || 0;
  const cashInc = state.transactions
    .filter(
      (t) =>
        (t.cardId === 'cash' && t.type === 'income') ||
        (t.toCardId === 'cash' && t.type === 'transfer')
    )
    .reduce((s, t) => s + t.amount, 0);
  const cashExp = state.transactions
    .filter(
      (t) =>
        (t.cardId === 'cash' && t.type === 'expense') ||
        (t.cardId === 'cash' && t.type === 'transfer')
    )
    .reduce((s, t) => s + t.amount, 0);
  const currentCashBalance = initialCash + cashInc - cashExp;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
        {/* Top Handle & Header */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 pt-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CircularIcon
                name={
                  type === 'expense'
                    ? 'arrow-up'
                    : type === 'income'
                    ? 'arrow-down'
                    : 'refresh'
                }
                color={
                  type === 'expense'
                    ? '#f43f5e'
                    : type === 'income'
                    ? '#10b981'
                    : '#0ea5e9'
                }
                size="md"
              />
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  {editingTransaction ? 'ویرایش تراکنش مالی' : 'ثبت دخل و خرج یا انتقال وجه'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ثبت سریع هزینه، درآمد، کارت به کارت یا برداشت نقد از عابربانک
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Quick 1-Tap Templates Strip (الگوهای پرتکرار با یک لمس) */}
          {!editingTransaction && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
                <Zap size={13} className="text-amber-500" />
                <span>ثبت فوق‌سریع با یک لمس (پر کردن خودکار عنوان و دسته):</span>
              </div>
              <div
                data-no-swipe="true"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full touch-pan-x"
              >
                {DEFAULT_QUICK_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyQuickTemplate(tpl)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      title === tpl.title
                        ? 'theme-bg text-white border-transparent shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-500/50'
                    }`}
                  >
                    {tpl.label}
                  </button>
                ))}
                {userFrequentTemplates.map((utx) => (
                  <button
                    key={utx.id}
                    type="button"
                    onClick={() => handleApplyUserTxTemplate(utx)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {utx.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Type Switcher: Expense vs Income vs Transfer (کارت به کارت / عابربانک) */}
          <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>ثبت هزینه (خرج)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>ثبت درآمد (ورودی)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('transfer')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === 'transfer'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowLeftRight size={13} />
              <span>انتقال / برداشت نقد</span>
            </button>
          </div>

          {/* Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                عنوان{' '}
                {type === 'expense'
                  ? 'هزینه'
                  : type === 'income'
                  ? 'درآمد'
                  : 'انتقال یا برداشت نقد'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === 'expense'
                    ? 'مثلاً: خرید میوه و پروتئینی'
                    : type === 'income'
                    ? 'مثلاً: واریز حقوق ماهانه'
                    : 'مثلاً: برداشت نقد عابربانک یا کارت به کارت'
                }
                className="w-full px-4 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  مبلغ ({settings.currencyUnit})
                </label>
                {numericAmountPreview > 0 && (
                  <span className="text-[11px] font-bold theme-text tabular-nums">
                    {formatMoney(numericAmountPreview, true, settings.currencyUnit)}
                  </span>
                )}
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={amountStr ? formatMoney(numericAmountPreview) : ''}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder={
                  settings.currencyUnit === 'ریال'
                    ? 'مثلاً: ۱۲،۵۰۰،۰۰۰ ریال'
                    : 'مثلاً: ۱،۲۵۰،۰۰۰ تومان'
                }
                className="w-full px-4 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
              {/* Live Persian Words Equivalent in Toman (همیشه به حروف و به تومان) */}
              <div className="mt-1.5 min-h-[22px] flex items-center justify-between gap-2">
                {numericAmountPreview > 0 ? (
                  <p className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 leading-relaxed">
                    معادل به تومان:{' '}
                    {formatAmountToTomanWords(
                      numericAmountPreview,
                      settings.currencyUnit
                    )}
                  </p>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    معادل حروفی مبلغ به تومان در این قسمت نمایش داده می‌شود
                  </span>
                )}
                {numericAmountPreview > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAmountStr((prev) => `${prev}0`)}
                      className="px-2 py-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-[10px] font-extrabold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-300"
                      title="افزودن یک صفر (×۱۰)"
                    >
                      +۰
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAmountStr((prev) =>
                          prev.length > 1 ? prev.slice(0, -1) : ''
                        )
                      }
                      className="px-2 py-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-[10px] font-extrabold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-300"
                      title="حذف یک رقم از آخر (÷۱۰)"
                    >
                      -۰
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* General Category & Subcategory Selection (Only for Expense / Income) */}
          {type !== 'transfer' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  دسته‌بندی اصلی
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {filteredCategories.map((cat) => {
                    const isSelected = activeCategory?.id === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-right transition-all cursor-pointer ${
                          isSelected
                            ? 'border-slate-900 dark:border-white bg-slate-900/5 dark:bg-white/10 shadow-xs'
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <CircularIcon
                          name={cat.icon}
                          color={cat.color}
                          size="sm"
                          variant={isSelected ? 'solid' : 'soft'}
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeCategory && activeCategory.subCategories.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    زیردسته (دسته‌بندی ریزترِ {activeCategory.name})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeCategory.subCategories.map((sub) => {
                      const isSubSelected = subCategoryId === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setSubCategoryId(sub.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            isSubSelected
                              ? 'theme-bg text-white border-transparent shadow-xs'
                              : 'bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span>{sub.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Source Card / Cash Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              {type === 'transfer'
                ? 'کسر از حساب مبدأ (از کدام کارت یا نقدی کسر شود؟)'
                : 'انتخاب کارت بانکی یا موجودی نقدی'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Cash Wallet Option */}
              <button
                type="button"
                onClick={() => setCardId('cash')}
                className={`flex items-center justify-between p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                  cardId === 'cash'
                    ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 ring-1 ring-emerald-500/40'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CircularIcon
                    name="wallet"
                    size="sm"
                    color="#10b981"
                    variant={cardId === 'cash' ? 'solid' : 'soft'}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      موجودی نقدی (کیف پول نقد)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      موجودی نقد: {formatMoney(currentCashBalance)} {settings.currencyUnit}
                    </div>
                  </div>
                </div>
                {cardId === 'cash' && (
                  <CircularIcon name="check" size="xs" color="#10b981" variant="solid" />
                )}
              </button>

              {cards.map((card) => {
                const isSelected = cardId === card.id;
                const bank = IRANIAN_BANKS[card.bankId] || IRANIAN_BANKS.other;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setCardId(card.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BankLogoVector bankId={card.bankId} size={34} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {card.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {bank.name}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <CircularIcon name="check" size="xs" color="#10b981" variant="solid" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destination Card / Cash Selection (When type === 'transfer') */}
          {type === 'transfer' && (
            <div className="p-3.5 rounded-2xl bg-sky-500/8 border border-sky-500/25 space-y-2.5">
              <label className="block text-xs font-extrabold text-sky-700 dark:text-sky-300">
                واریز به حساب مقصد (به کدام کارت یا کیف پول نقدی اضافه شود؟)
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                این انتقال، موجودی مبدأ را کم و موجودی مقصد را زیاد می‌کند و جزو خرج‌های ماهانه شمارش نمی‌شود.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setToCardId('cash')}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                    toCardId === 'cash'
                      ? 'border-sky-500 bg-sky-500/15 ring-1 ring-sky-500/40'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CircularIcon
                      name="wallet"
                      size="sm"
                      color="#0ea5e9"
                      variant={toCardId === 'cash' ? 'solid' : 'soft'}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        افزودن به موجودی نقدی (کیف پول نقد)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        مناسب برداشت وجه نقد از عابربانک
                      </div>
                    </div>
                  </div>
                  {toCardId === 'cash' && (
                    <CircularIcon name="check" size="xs" color="#0ea5e9" variant="solid" />
                  )}
                </button>

                {cards.map((card) => {
                  const isDest = toCardId === card.id;
                  const bank = IRANIAN_BANKS[card.bankId] || IRANIAN_BANKS.other;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setToCardId(card.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                        isDest
                          ? 'border-sky-500 bg-sky-500/15 ring-1 ring-sky-500/40'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BankLogoVector bankId={card.bankId} size={34} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {card.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {bank.name}
                          </div>
                        </div>
                      </div>
                      {isDest && (
                        <CircularIcon name="check" size="xs" color="#0ea5e9" variant="solid" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date & Time Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              زمان و تاریخ تراکنش
            </label>
            <JalaliDateTimePicker
              jalaliDate={jalaliDate}
              time={time}
              onChangeDate={setJalaliDate}
              onChangeTime={setTime}
            />
          </div>

          {/* Tags Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              تگ‌ها (برچسب‌های دلخواه)
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      active
                        ? 'text-white border-transparent shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                    style={active ? { backgroundColor: tag.color } : undefined}
                  >
                    #{tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              توضیحات تکمیلی (اختیاری)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="یادداشت یا جزئیات فاکتور..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit & Edit Actions */}
          <div className="pt-2 space-y-2.5">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl theme-gradient text-white font-extrabold text-sm shadow-lg hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
            >
              {editingTransaction
                ? 'ذخیره تغییرات تراکنش'
                : type === 'transfer'
                ? 'ثبت انتقال وجه / برداشت نقد'
                : 'ثبت نهایی در کیف پول'}
            </button>

            {editingTransaction && (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const activeUserId = state.userId || 'hootan';
                    onSave({
                      title: title.trim() || editingTransaction.title,
                      amount: numericAmountPreview || editingTransaction.amount,
                      type,
                      categoryId: activeCategory?.id || categoryId,
                      subCategoryId:
                        subCategoryId || activeCategory?.subCategories[0]?.id || '',
                      tags: selectedTags,
                      spentBy: activeUserId,
                      recordedBy: activeUserId,
                      cardId,
                      toCardId: type === 'transfer' ? toCardId : undefined,
                      jalaliDate: getCurrentJalaliDateStr(),
                      time: getCurrentTimeStr(),
                      note: note.trim(),
                    });
                    onClose();
                  }}
                  className="py-2.5 px-3 rounded-2xl bg-sky-500/12 hover:bg-sky-500/20 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Copy size={14} />
                  <span>تکرار این تراکنش برای امروز</span>
                </button>

                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(editingTransaction.id);
                      onClose();
                    }}
                    className="py-2.5 px-3 rounded-2xl bg-rose-500/12 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span>حذف تراکنش (با قابلیت بازگردانی)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
