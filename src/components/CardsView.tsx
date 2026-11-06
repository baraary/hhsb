import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Palette, Shuffle, Plus, X, Check } from 'lucide-react';
import {
  AppState,
  BankCard,
  CardColorThemeId,
  CardPatternId,
  IranianBankId,
} from '../types';
import { BankCardVisual } from './BankCardVisual';
import {
  IRANIAN_BANKS,
  BankLogoVector,
  detectBankByCardNumber,
} from '../utils/iranianBanks';
import {
  CARD_COLOR_PALETTES,
  CARD_VECTOR_PATTERNS,
  pickRandomCardStyle,
  resolveCardPattern,
} from '../utils/cardThemesAndPatterns';
import { formatMoney, toEnglishDigits, toPersianDigits } from '../utils/persian';
import { CircularIcon } from './CircularIcon';

interface CardsViewProps {
  state: AppState;
  onSaveCard: (card: Omit<BankCard, 'id'>, existingId?: string) => void;
  onDeleteCard: (id: string) => void;
}

export const CardsView: React.FC<CardsViewProps> = ({
  state,
  onSaveCard,
  onDeleteCard,
}) => {
  const { cards, transactions, settings } = state;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<BankCard | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [bankId, setBankId] = useState<IranianBankId>('mellat');
  const [shebaNumber, setShebaNumber] = useState('');
  const [initialBalanceStr, setInitialBalanceStr] = useState('0');
  const [expiryDate, setExpiryDate] = useState('06/05');
  const [cardColorTheme, setCardColorTheme] = useState<CardColorThemeId>('auto');
  const [patternId, setPatternId] = useState<CardPatternId>('silk_waves');
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    const randomStyle = pickRandomCardStyle();
    setEditingCard(null);
    setTitle('');
    setCardNumber('');
    setBankId('mellat');
    setShebaNumber('');
    setInitialBalanceStr('0');
    setExpiryDate('06/05');
    setCardColorTheme('auto');
    setPatternId(randomStyle.patternId);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (card: BankCard) => {
    setEditingCard(card);
    setTitle(card.title);
    setCardNumber(card.cardNumber);
    setBankId(card.bankId);
    setShebaNumber(card.shebaNumber || '');
    setInitialBalanceStr(String(card.initialBalance));
    setExpiryDate(card.expiryDate);
    setCardColorTheme(card.cardColorTheme || 'auto');
    setPatternId(resolveCardPattern(card));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleQuickRandomizeCard = (card: BankCard) => {
    const next = pickRandomCardStyle(card.cardColorTheme, resolveCardPattern(card));
    onSaveCard(
      {
        title: card.title,
        bankId: card.bankId,
        cardNumber: card.cardNumber,
        shebaNumber: card.shebaNumber,
        initialBalance: card.initialBalance,
        expiryDate: card.expiryDate,
        isDefault: card.isDefault,
        cardColorTheme: next.cardColorTheme,
        patternId: next.patternId,
      },
      card.id
    );
  };

  const handleCardNumberChange = (val: string) => {
    const clean = toEnglishDigits(val).replace(/\D/g, '').slice(0, 16);
    setCardNumber(clean);
    const detected = detectBankByCardNumber(clean);
    if (detected) {
      setBankId(detected);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || IRANIAN_BANKS[bankId]?.name || 'کارت بانکی';
    const cleanDigits = toEnglishDigits(cardNumber).replace(/\D/g, '');
    const defaultPrefix = IRANIAN_BANKS[bankId]?.prefixes?.[0] || '610433';
    const finalCardNumber =
      cleanDigits.length === 16
        ? cleanDigits
        : cleanDigits.length > 0
        ? cleanDigits.padEnd(16, '0')
        : `${defaultPrefix}0000000000`.slice(0, 16);

    onSaveCard(
      {
        title: finalTitle,
        bankId,
        cardNumber: finalCardNumber,
        shebaNumber: shebaNumber.trim() || undefined,
        initialBalance: parseInt(
          toEnglishDigits(initialBalanceStr).replace(/\D/g, '') || '0',
          10
        ),
        expiryDate: expiryDate || '06/05',
        cardColorTheme,
        patternId,
      },
      editingCard?.id
    );
    setIsModalOpen(false);
  };

  // Preview card object inside modal
  const previewCard: BankCard = {
    id: editingCard?.id || 'preview_card',
    title: title.trim() || IRANIAN_BANKS[bankId]?.name || 'کارت بانکی من',
    bankId,
    cardNumber: (cardNumber || IRANIAN_BANKS[bankId]?.prefixes?.[0] || '610433').padEnd(
      16,
      '•'
    ),
    shebaNumber: shebaNumber.trim() || undefined,
    initialBalance: parseInt(
      toEnglishDigits(initialBalanceStr).replace(/\D/g, '') || '0',
      10
    ),
    expiryDate: expiryDate || '06/05',
    cardColorTheme,
    patternId,
  };

  const modalNode =
    isModalOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            data-no-swipe="true"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4"
          >
            <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-2xl text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <BankLogoVector
                    bankId={bankId}
                    size={36}
                    mono={settings.colorTheme === 'monochrome' && cardColorTheme === 'auto'}
                  />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {editingCard
                        ? 'ویرایش مشخصات، رنگ پاستیلی و پترن کارت'
                        : 'ثبت کارت بانکی جدید'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      طراحی شیشه‌ای (Glassmorphic) + ۲۵ طیف رنگی پاستیلی و ۲۰ پترن وکتور
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <X size={14} />
                  <span>بستن</span>
                </button>
              </div>

              {/* Live Card Visual Preview inside Modal */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                    پیش‌نمایش زنده کارت شیشه‌ای:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCardColorTheme('auto')}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                        cardColorTheme === 'auto'
                          ? 'theme-bg text-white border-transparent'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Palette size={13} />
                      <span>رنگ خودکار بانک</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = pickRandomCardStyle(cardColorTheme, patternId);
                        setCardColorTheme(next.cardColorTheme);
                        setPatternId(next.patternId);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      <Shuffle size={13} />
                      <span>رنگ و پترن شانسی (رندوم)</span>
                    </button>
                  </div>
                </div>

                <BankCardVisual
                  card={previewCard}
                  transactions={[]}
                  currencyUnit={settings.currencyUnit}
                  isMonochrome={settings.colorTheme === 'monochrome'}
                  compact
                />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      عنوان دلخواه کارت
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="مثلاً: بلوبانک، ملت، وی‌پاد..."
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      شماره ۱۶ رقمی کارت (اختیاری - تشخیص خودکار بانک)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      placeholder="6104337812345678"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-sans tabular-nums text-sm font-bold tracking-widest text-center text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Color Background Palette Selector (Auto + 24 Pastel & Glass Gradients) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      انتخاب طیف رنگ پاستیلی و شیشه‌ای ({toPersianDigits(CARD_COLOR_PALETTES.length)} رنگ):
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = pickRandomCardStyle(cardColorTheme, patternId);
                        setCardColorTheme(next.cardColorTheme);
                      }}
                      className="text-[11px] font-bold theme-text hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Shuffle size={12} />
                      <span>انتخاب رنگ رندوم</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1">
                    {CARD_COLOR_PALETTES.map((pal) => {
                      const isSelected = cardColorTheme === pal.id;
                      return (
                        <button
                          key={pal.id}
                          type="button"
                          onClick={() => setCardColorTheme(pal.id)}
                          className={`flex items-center justify-between gap-2 p-2 rounded-xl border text-right transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-5 h-5 rounded-full shrink-0 border border-white/40 shadow-xs"
                              style={{
                                background: `linear-gradient(135deg, ${pal.from}, ${pal.via}, ${pal.to})`,
                              }}
                            />
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                              {pal.name}
                            </span>
                          </div>
                          {isSelected && (
                            <Check size={12} className="text-emerald-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vector Pattern Selector (20 SVG Patterns) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      انتخاب پترن و طراحی وکتور روی کارت ({toPersianDigits(CARD_VECTOR_PATTERNS.length)} طرح وکتور):
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = pickRandomCardStyle(cardColorTheme, patternId);
                        setPatternId(next.patternId);
                      }}
                      className="text-[11px] font-bold theme-text hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Shuffle size={12} />
                      <span>انتخاب پترن رندوم</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                    {CARD_VECTOR_PATTERNS.map((pat) => {
                      const isSelected = patternId === pat.id;
                      return (
                        <button
                          key={pat.id}
                          type="button"
                          onClick={() => setPatternId(pat.id)}
                          className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">
                            {pat.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {pat.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Iranian Bank Selector Grid */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    انتخاب بانک صادرکننده (لوگوی وکتور دایره‌ای)
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                    {Object.values(IRANIAN_BANKS).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBankId(b.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-right transition-all cursor-pointer ${
                          bankId === b.id
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <BankLogoVector bankId={b.id} size={24} />
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                          {b.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      موجودی اولیه ({settings.currencyUnit})
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        initialBalanceStr
                          ? formatMoney(
                              parseInt(
                                toEnglishDigits(initialBalanceStr).replace(/\D/g, '') || '0',
                                10
                              )
                            )
                          : '۰'
                      }
                      onChange={(e) =>
                        setInitialBalanceStr(
                          toEnglishDigits(e.target.value).replace(/\D/g, '')
                        )
                      }
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      تاریخ انقضا (ماه/سال)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      placeholder="06/05"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-center tabular-nums text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    شماره شبا (اختیاری - برای کپی سریع)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={shebaNumber}
                    onChange={(e) => setShebaNumber(e.target.value.toUpperCase())}
                    placeholder="IR420120000000007845128904"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-sans tabular-nums text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl theme-gradient text-white font-extrabold text-sm shadow-lg cursor-pointer"
                >
                  {editingCard ? 'بروزرسانی کارت بانکی' : 'افزودن کارت به کیف پول'}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CircularIcon name="credit-card" size="md" color="#0ea5e9" />
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              کارت‌های بانکی شیشه‌ای ({toPersianDigits(cards.length)} کارت)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              طراحی شیشه‌ای مات (Glassmorphic) + ۲۵ طیف رنگی پاستیلی و ۲۰ پترن وکتور
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-2xl theme-gradient text-white text-xs font-extrabold shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>افزودن کارت بانکی جدید</span>
          </button>
        </div>
      </div>

      {/* Bank Cards Grid */}
      {cards.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-10 text-center space-y-3">
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
            هنوز هیچ کارت بانکی در حساب شما ثبت نشده است.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-2xl theme-bg text-white text-xs font-extrabold cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>ثبت اولین کارت بانکی</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const cardTxs = transactions.filter((t) => t.cardId === card.id);
            const activePatternMeta = CARD_VECTOR_PATTERNS.find(
              (p) => p.id === resolveCardPattern(card)
            );
            return (
              <div key={card.id} className="space-y-1.5">
                <BankCardVisual
                  card={card}
                  transactions={transactions}
                  currencyUnit={settings.currencyUnit}
                  isMonochrome={settings.colorTheme === 'monochrome'}
                  onEdit={openEditModal}
                  onRandomizeStyle={handleQuickRandomizeCard}
                />
                <div className="px-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>{toPersianDigits(cardTxs.length)} تراکنش</span>
                    <span>·</span>
                    <span className="text-[11px] text-slate-400">
                      پترن: {activePatternMeta?.name || 'موج‌های ابریشمی'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openEditModal(card)}
                      className="text-slate-600 dark:text-slate-300 hover:underline font-bold cursor-pointer"
                    >
                      تغییر رنگ و پترن
                    </button>
                    {cards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteCard(card.id)}
                        className="text-rose-500 hover:underline font-semibold cursor-pointer"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalNode}
    </div>
  );
};
