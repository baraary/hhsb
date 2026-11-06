import React, { useState, useEffect } from 'react';
import {
  AppState,
  Transaction,
  TransactionType,
} from '../types';
import {
  toEnglishDigits,
  formatMoney,
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
  editingTransaction?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  state,
  onSave,
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
  const [jalaliDate, setJalaliDate] = useState(() => getCurrentJalaliDateStr());
  const [time, setTime] = useState('19:30');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const filteredCategories = categories.filter((c) => c.type === type);
  const activeCategory =
    filteredCategories.find((c) => c.id === categoryId) || filteredCategories[0];

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setTitle(editingTransaction.title);
      setAmountStr(String(editingTransaction.amount));
      setCategoryId(editingTransaction.categoryId);
      setSubCategoryId(editingTransaction.subCategoryId);
      setSelectedTags(editingTransaction.tags);
      setCardId(editingTransaction.cardId);
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
      setCardId(defaultCard?.id || '');
      setJalaliDate(getCurrentJalaliDateStr());
      setTime(getCurrentTimeStr());
      setNote('');
      setError('');
    }
  }, [editingTransaction, isOpen, categories, cards]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const firstCat = categories.find((c) => c.type === newType);
    if (firstCat) {
      setCategoryId(firstCat.id);
      setSubCategoryId(firstCat.subCategories[0]?.id || '');
    }
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
      setError('لطفاً کارت بانکی را انتخاب کنید.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
        {/* Top Handle & Header */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 pt-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CircularIcon
                name={type === 'expense' ? 'arrow-up' : 'arrow-down'}
                color={type === 'expense' ? '#f43f5e' : '#10b981'}
                size="md"
              />
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  {editingTransaction ? 'ویرایش تراکنش مالی' : 'ثبت دخل و خرج جدید'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ثبت سریع هزینه یا درآمد با دسته‌بندی ریز و کارت بانکی
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

          {/* Type Switcher: Expense vs Income */}
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
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
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>ثبت درآمد (ورودی)</span>
            </button>
          </div>

          {/* Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                عنوان {type === 'expense' ? 'هزینه' : 'درآمد'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === 'expense'
                    ? 'مثلاً: خرید میوه و پروتئینی'
                    : 'مثلاً: واریز حقوق ماهانه'
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
                placeholder="مثلاً: ۱،۲۵۰،۰۰۰"
                className="w-full px-4 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* General Category Selection */}
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

          {/* Subcategory Selection (دسته‌بندی ریزتر) */}
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

          {/* Bank Card Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              انتخاب کارت بانکی
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl theme-gradient text-white font-extrabold text-sm shadow-lg hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
            >
              {editingTransaction ? 'ذخیره تغییرات تراکنش' : 'ثبت نهایی در کیف پول'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
