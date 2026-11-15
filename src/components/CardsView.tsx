import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Palette,
  Shuffle,
  Plus,
  X,
  Check,
  Banknote,
  ListFilter,
  LayoutGrid,
  GalleryHorizontalEnd,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import {
  AppState,
  BankCard,
  CardColorThemeId,
  CardPatternId,
  IranianBankId,
  Transaction,
} from '../types';
import { BankCardVisual } from './BankCardVisual';
import {
  IRANIAN_BANKS,
  BankLogoVector,
  detectBankByCardNumber,
  detectBankByText,
} from '../utils/iranianBanks';
import {
  CARD_COLOR_PALETTES,
  CARD_VECTOR_PATTERNS,
  pickRandomCardStyle,
  resolveCardPattern,
} from '../utils/cardThemesAndPatterns';
import {
  formatMoney,
  formatJalaliReadable,
  toEnglishDigits,
  toPersianDigits,
} from '../utils/persian';
import { CircularIcon } from './CircularIcon';

interface CardsViewProps {
  state: AppState;
  onSaveCard: (card: Omit<BankCard, 'id'>, existingId?: string) => void;
  onDeleteCard: (id: string) => void;
  onUpdateCashBalance: (newInitialCash: number) => void;
  onChangeCardsViewMode?: (mode: 'grid' | 'carousel') => void;
  onEditTransaction?: (tx: Transaction) => void;
}

export const CardsView: React.FC<CardsViewProps> = ({
  state,
  onSaveCard,
  onDeleteCard,
  onUpdateCashBalance,
  onChangeCardsViewMode,
  onEditTransaction,
}) => {
  const { cards, transactions, categories, settings } = state;
  const isPrivacy = Boolean(settings.privacyMode);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<BankCard | null>(null);
  const [cardDisplayMode, setCardDisplayMode] = useState<'carousel' | 'grid'>(
    () => settings.cardsViewMode || 'carousel'
  );
  const [activeCarouselIdx, setActiveCarouselIdx] = useState<number>(0);

  const carouselTrackRef = useRef<HTMLDivElement | null>(null);
  const cardItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wheelCooldownRef = useRef<number>(0);
  const isProgrammaticScrollRef = useRef<boolean>(false);

  useEffect(() => {
    if (settings.cardsViewMode && settings.cardsViewMode !== cardDisplayMode) {
      setCardDisplayMode(settings.cardsViewMode);
    }
  }, [settings.cardsViewMode]);

  const handleSelectDisplayMode = (mode: 'carousel' | 'grid') => {
    setCardDisplayMode(mode);
    if (onChangeCardsViewMode) {
      onChangeCardsViewMode(mode);
    }
    if (mode === 'grid') {
      setSelectedSourceId('all');
    } else if (cards[activeCarouselIdx]) {
      setSelectedSourceId(cards[activeCarouselIdx].id);
    }
  };

  const scrollToCardIndex = useCallback(
    (targetIdx: number) => {
      if (cards.length === 0) return;
      const clamped = Math.min(cards.length - 1, Math.max(0, targetIdx));
      setActiveCarouselIdx(clamped);
      setSelectedSourceId(cards[clamped].id);
      const node = cardItemRefs.current[clamped];
      if (node) {
        isProgrammaticScrollRef.current = true;
        node.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 420);
      }
    },
    [cards]
  );

  // Detect active card while user scrolls horizontally with finger/touchpad/scrollbar
  const handleCarouselScroll = () => {
    if (isProgrammaticScrollRef.current) return;
    const container = carouselTrackRef.current;
    if (!container || cards.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;

    let closestIdx = activeCarouselIdx;
    let minDistance = Infinity;

    cardItemRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const dist = Math.abs(containerCenter - cardCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    if (closestIdx !== activeCarouselIdx && cards[closestIdx]) {
      setActiveCarouselIdx(closestIdx);
      setSelectedSourceId(cards[closestIdx].id);
    }
  };

  // Support mouse wheel scrolling over the card carousel to transition smoothly between cards
  const handleCarouselWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (cards.length <= 1) return;
    // If predominantly vertical wheel or horizontal wheel, step to next/prev card with a short cooldown
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 12) return;
    const now = Date.now();
    if (now - wheelCooldownRef.current < 320) return;
    wheelCooldownRef.current = now;

    if (delta > 0) {
      const nextIdx = Math.min(cards.length - 1, activeCarouselIdx + 1);
      if (nextIdx !== activeCarouselIdx) {
        e.preventDefault();
        scrollToCardIndex(nextIdx);
      }
    } else {
      const prevIdx = Math.max(0, activeCarouselIdx - 1);
      if (prevIdx !== activeCarouselIdx) {
        e.preventDefault();
        scrollToCardIndex(prevIdx);
      }
    }
  };

  // Cash Balance editor state
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashEditMode, setCashEditMode] = useState<'add' | 'set'>('add');
  const [cashInputStr, setCashInputStr] = useState('');

  // Selected source ('all' | 'cash' | card.id) for viewing transactions broken down by cards & cash
  const [selectedSourceId, setSelectedSourceId] = useState<string>('all');

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

  const handleTitleChange = (val: string) => {
    setTitle(val);
    const cleanDigits = toEnglishDigits(cardNumber).replace(/\D/g, '');
    const hasRealCardPrefix =
      cleanDigits.length >= 6 &&
      !cleanDigits.endsWith('0000000000') &&
      Boolean(detectBankByCardNumber(cleanDigits));
    if (!hasRealCardPrefix) {
      const detectedFromTitle = detectBankByText(val);
      if (detectedFromTitle) {
        setBankId(detectedFromTitle);
      }
    }
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
    const cleanDigits = toEnglishDigits(cardNumber).replace(/\D/g, '');
    const detectedByDigits =
      cleanDigits.length >= 6 && !cleanDigits.endsWith('0000000000')
        ? detectBankByCardNumber(cleanDigits)
        : null;
    const detectedByTitle = detectBankByText(title);
    const resolvedBankId: IranianBankId =
      detectedByDigits ||
      (bankId === 'mellat' && detectedByTitle ? detectedByTitle : bankId);

    const finalTitle =
      title.trim() || IRANIAN_BANKS[resolvedBankId]?.name || 'کارت بانکی';
    const defaultPrefix = IRANIAN_BANKS[resolvedBankId]?.prefixes?.[0] || '610433';
    const finalCardNumber =
      cleanDigits.length === 16 &&
      (!cleanDigits.endsWith('0000000000') || cleanDigits.startsWith(defaultPrefix))
        ? cleanDigits
        : cleanDigits.length > 0 && !cleanDigits.endsWith('0000000000')
        ? cleanDigits.padEnd(16, '0')
        : `${defaultPrefix}0000000000`.slice(0, 16);

    onSaveCard(
      {
        title: finalTitle,
        bankId: resolvedBankId,
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
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="مثلاً: بانک رفاه، بلوبانک، ملت، وی‌پاد..."
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

  // Live Cash Balance calculations (accounting for transfers!)
  const initialCash = settings.initialCashBalance || 0;
  const cashIncomes = transactions
    .filter(
      (t) =>
        (t.cardId === 'cash' && t.type === 'income') ||
        (t.toCardId === 'cash' && t.type === 'transfer')
    )
    .reduce((s, t) => s + t.amount, 0);
  const cashExpenses = transactions
    .filter(
      (t) =>
        (t.cardId === 'cash' && t.type === 'expense') ||
        (t.cardId === 'cash' && t.type === 'transfer')
    )
    .reduce((s, t) => s + t.amount, 0);
  const currentCashBalance = initialCash + cashIncomes - cashExpenses;
  const cashTransactionsCount = transactions.filter(
    (t) => t.cardId === 'cash' || t.toCardId === 'cash'
  ).length;

  const handleSaveCashForm = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseInt(toEnglishDigits(cashInputStr).replace(/\D/g, '') || '0', 10);
    if (cashEditMode === 'add') {
      if (numeric <= 0) return;
      onUpdateCashBalance(initialCash + numeric);
    } else {
      const targetInitial = numeric - cashIncomes + cashExpenses;
      onUpdateCashBalance(targetInitial);
    }
    setCashInputStr('');
    setIsEditingCash(false);
  };

  const sourceTransactions = [...transactions]
    .filter((t) =>
      selectedSourceId === 'all'
        ? true
        : t.cardId === selectedSourceId || t.toCardId === selectedSourceId
    )
    .sort((a, b) => {
      const dCmp = b.jalaliDate.localeCompare(a.jalaliDate);
      if (dCmp !== 0) return dCmp;
      return b.time.localeCompare(a.time);
    });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CircularIcon name="credit-card" size="md" color="#0ea5e9" />
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              کارت‌های بانکی شیشه‌ای ({toPersianDigits(cards.length)} کارت) و موجودی نقدی
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ورق زدن کارت‌ها در نمای اسلایدر کیف پول یا شبکه‌ای + مشاهده ریز تراکنش هر کارت
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: Carousel Stack vs Grid */}
          {cards.length > 0 && (
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => handleSelectDisplayMode('carousel')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer flex items-center gap-1.5 transition-all ${
                  cardDisplayMode === 'carousel'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <GalleryHorizontalEnd size={14} />
                <span>مدل فعلی (اسلایدر اسکرول‌پذیر)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectDisplayMode('grid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer flex items-center gap-1.5 transition-all ${
                  cardDisplayMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <LayoutGrid size={14} />
                <span>مدل قبلی (نمایش شبکه‌ای)</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setIsEditingCash((prev) => !prev);
              setCashEditMode('add');
              setCashInputStr('');
            }}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <Banknote size={15} />
            <span>افزودن / تنظیم موجودی نقدی</span>
          </button>

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

      {/* Dedicated Cash Wallet Card (کیف پول نقدی) */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-slate-900 text-white p-5 shadow-lg relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/25">
              <Banknote size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black">
                  کیف پول نقدی (موجودی نقد)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-bold tabular-nums">
                  {toPersianDigits(cashTransactionsCount)} تراکنش نقدی
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5 tabular-nums">
                ورودی نقد: +{isPrivacy ? '•••••' : formatMoney(cashIncomes)} · خروجی نقد: -
                {isPrivacy ? '•••••' : formatMoney(cashExpenses)} {settings.currencyUnit}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3">
            <div className="text-right sm:text-left tabular-nums">
              <span className="text-[10px] text-white/75 block">موجودی نقدی فعلی</span>
              <span className="text-xl sm:text-2xl font-black">
                {isPrivacy ? '•••••••' : formatMoney(currentCashBalance)}{' '}
                <span className="text-xs font-semibold">{settings.currencyUnit}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditingCash((prev) => !prev);
                  setCashEditMode('add');
                  setCashInputStr('');
                }}
                className="px-3 py-2 rounded-xl bg-white text-emerald-950 text-xs font-extrabold cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>افزایش موجودی نقد</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedSourceId(selectedSourceId === 'cash' ? 'all' : 'cash')
                }
                className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold cursor-pointer"
              >
                {selectedSourceId === 'cash' ? 'نمایش همه' : 'مشاهده تراکنش‌های نقد'}
              </button>
            </div>
          </div>
        </div>

        {isEditingCash && (
          <form
            onSubmit={handleSaveCashForm}
            className="p-3.5 rounded-2xl bg-black/25 backdrop-blur-md border border-white/20 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-white">
                مدیریت موجودی نقدی کیف پول:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCashEditMode('add')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    cashEditMode === 'add'
                      ? 'bg-white text-emerald-950'
                      : 'bg-white/15 text-white'
                  }`}
                >
                  + افزودن به موجودی نقد فعلی
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCashEditMode('set');
                    setCashInputStr(String(Math.max(0, currentCashBalance)));
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    cashEditMode === 'set'
                      ? 'bg-white text-emerald-950'
                      : 'bg-white/15 text-white'
                  }`}
                >
                  تنظیم دقیق کل موجودی نقد
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
                  cashEditMode === 'add'
                    ? `مبلغ مورد نظر برای افزودن به موجودی نقدی (${settings.currencyUnit})...`
                    : `مبلغ کل موجودی نقدی جدید (${settings.currencyUnit})...`
                }
                className="flex-1 px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-extrabold tabular-nums"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black cursor-pointer"
                >
                  ذخیره موجودی نقدی
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingCash(false)}
                  className="px-3 py-2 rounded-xl bg-white/15 text-white text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Dedicated Display Model Switcher Bar right above Bank Cards */}
      {cards.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 dark:text-slate-200">
            <span>انتخاب نحوه نمایش کارت‌های بانکی:</span>
            <span className="text-[11px] font-medium text-slate-400">
              (انتخاب شما ذخیره می‌شود)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => handleSelectDisplayMode('carousel')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer flex items-center justify-center gap-2 transition-all ${
                cardDisplayMode === 'carousel'
                  ? 'theme-bg text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GalleryHorizontalEnd size={15} />
              <span>مدل فعلی (اسکرول و ورق زدن کارت‌ها)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDisplayMode('grid')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer flex items-center justify-center gap-2 transition-all ${
                cardDisplayMode === 'grid'
                  ? 'theme-bg text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid size={15} />
              <span>مدل قبلی (نمایش شبکه‌ای همه کارت‌ها)</span>
            </button>
          </div>
        </div>
      )}

      {/* Bank Cards: Scrollable Carousel Mode OR Classic Grid Mode */}
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
      ) : cardDisplayMode === 'carousel' ? (
        <div
          data-no-swipe="true"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onWheel={handleCarouselWheel}
          className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 space-y-4"
        >
          {(() => {
            const safeIdx = Math.min(cards.length - 1, Math.max(0, activeCarouselIdx));
            const activeCard = cards[safeIdx];
            const activeCardTxs = transactions.filter(
              (t) => t.cardId === activeCard.id || t.toCardId === activeCard.id
            );

            return (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      کارت {toPersianDigits(safeIdx + 1)} از {toPersianDigits(cards.length)}:{' '}
                      <span className="theme-text">{activeCard.title}</span>
                    </span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      (با اسکرول موس، کشیدن انگشت یا دکمه‌ها بین کارت‌ها جابه‌جا شوید)
                    </span>
                  </div>

                  {/* Quick Card Pill Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
                    {cards.map((c, idx) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => scrollToCardIndex(idx)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap ${
                          idx === safeIdx
                            ? 'theme-bg text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <BankLogoVector bankId={c.bankId} size={15} />
                        <span>{c.title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horizontal Scroll-Snap Track for Smooth Scrolling Between All Cards */}
                <div
                  ref={carouselTrackRef}
                  onScroll={handleCarouselScroll}
                  className="flex items-center gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 pt-1 px-2 sm:px-8 touch-pan-x"
                >
                  {cards.map((c, idx) => {
                    const isFocused = idx === safeIdx;
                    return (
                      <div
                        key={c.id}
                        ref={(el) => {
                          cardItemRefs.current[idx] = el;
                        }}
                        onClick={() => {
                          if (!isFocused) {
                            scrollToCardIndex(idx);
                          }
                        }}
                        className={`w-[88%] sm:w-[440px] shrink-0 snap-center transition-all duration-300 cursor-pointer ${
                          isFocused
                            ? 'scale-100 opacity-100'
                            : 'scale-95 opacity-60 hover:opacity-85'
                        }`}
                      >
                        <BankCardVisual
                          card={c}
                          transactions={transactions}
                          currencyUnit={settings.currencyUnit}
                          isMonochrome={settings.colorTheme === 'monochrome'}
                          privacyMode={isPrivacy}
                          onEdit={openEditModal}
                          onRandomizeStyle={handleQuickRandomizeCard}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Navigation Controls & Progress Dots */}
                {cards.length > 1 && (
                  <div className="max-w-lg mx-auto flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const prevIdx = (safeIdx - 1 + cards.length) % cards.length;
                        scrollToCardIndex(prevIdx);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronRight size={15} />
                      <span>کارت قبلی</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {cards.map((c, idx) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => scrollToCardIndex(idx)}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            idx === safeIdx
                              ? 'w-6 theme-bg'
                              : 'w-2 bg-slate-300 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextIdx = (safeIdx + 1) % cards.length;
                        scrollToCardIndex(nextIdx);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      <span>کارت بعدی</span>
                      <ChevronLeft size={15} />
                    </button>
                  </div>
                )}

                {/* Footer Actions for Focused Card */}
                <div className="max-w-lg mx-auto pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSourceId(
                        selectedSourceId === activeCard.id ? 'all' : activeCard.id
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl font-extrabold cursor-pointer ${
                      selectedSourceId === activeCard.id
                        ? 'theme-bg text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {selectedSourceId === activeCard.id
                      ? `در حال نمایش تراکنش‌های ${activeCard.title} (${toPersianDigits(
                          activeCardTxs.length
                        )})`
                      : `فیلتر تراکنش‌های ${activeCard.title} (${toPersianDigits(
                          activeCardTxs.length
                        )})`}
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openEditModal(activeCard)}
                      className="text-slate-600 dark:text-slate-300 hover:underline font-bold cursor-pointer"
                    >
                      ویرایش مشخصات و طرح کارت
                    </button>
                    {cards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteCard(activeCard.id)}
                        className="text-rose-500 hover:underline font-semibold cursor-pointer"
                      >
                        حذف کارت
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const cardTxs = transactions.filter(
              (t) => t.cardId === card.id || t.toCardId === card.id
            );
            const activePatternMeta = CARD_VECTOR_PATTERNS.find(
              (p) => p.id === resolveCardPattern(card)
            );
            const isSelectedForTx = selectedSourceId === card.id;
            return (
              <div key={card.id} className="space-y-1.5">
                <BankCardVisual
                  card={card}
                  transactions={transactions}
                  currencyUnit={settings.currencyUnit}
                  isMonochrome={settings.colorTheme === 'monochrome'}
                  privacyMode={isPrivacy}
                  onEdit={openEditModal}
                  onRandomizeStyle={handleQuickRandomizeCard}
                />
                <div className="px-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSourceId(isSelectedForTx ? 'all' : card.id)
                      }
                      className={`px-2.5 py-1 rounded-lg font-extrabold cursor-pointer transition-colors ${
                        isSelectedForTx
                          ? 'theme-bg text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      مشاهده تراکنش‌ها ({toPersianDigits(cardTxs.length)})
                    </button>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      پترن: {activePatternMeta?.name || 'موج‌های ابریشمی'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openEditModal(card)}
                      className="text-slate-600 dark:text-slate-300 hover:underline font-bold cursor-pointer"
                    >
                      ویرایش کارت
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

      {/* Breakdown of Transactions by Bank Card and Cash Balance */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <ListFilter size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                ریز تراکنش‌ها به تفکیک کارت‌ها و موجودی نقدی
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                انتخاب هر کارت بانکی یا کیف پول نقدی برای بررسی واریزها و برداشت‌های همان حساب
              </p>
            </div>
          </div>
        </div>

        {/* Selector Bar */}
        <div
          data-no-swipe="true"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-x-auto max-w-full touch-pan-x"
        >
          <button
            type="button"
            onClick={() => setSelectedSourceId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer whitespace-nowrap shrink-0 ${
              selectedSourceId === 'all'
                ? 'theme-bg text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            همه کارت‌ها و نقدی ({toPersianDigits(transactions.length)})
          </button>

          <button
            type="button"
            onClick={() => setSelectedSourceId('cash')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              selectedSourceId === 'cash'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white/70 dark:bg-slate-900/60 text-emerald-700 dark:text-emerald-400'
            }`}
          >
            <Banknote size={13} />
            <span>موجودی نقدی ({toPersianDigits(cashTransactionsCount)})</span>
          </button>

          {cards.map((c) => {
            const cCount = transactions.filter((t) => t.cardId === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedSourceId(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  selectedSourceId === c.id
                    ? 'theme-bg text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <BankLogoVector bankId={c.bankId} size={16} />
                <span>
                  {c.title} ({toPersianDigits(cCount)})
                </span>
              </button>
            );
          })}
        </div>

        {/* Transactions for the selected Card or Cash Wallet */}
        {sourceTransactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            هیچ تراکنشی برای این حساب ثبت نشده است.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sourceTransactions.map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoryId);
              const sub = cat?.subCategories.find((s) => s.id === tx.subCategoryId);
              const isCash = tx.cardId === 'cash';
              const cardObj = cards.find((c) => c.id === tx.cardId);

              return (
                <div
                  key={tx.id}
                  onClick={() => onEditTransaction && onEditTransaction(tx)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 -mx-2 rounded-xl cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CircularIcon
                      name={cat?.icon || 'layers'}
                      color={cat?.color || '#10b981'}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {tx.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        <span>{cat?.name || 'سایر'}</span>
                        {sub && <span>· {sub.name}</span>}
                        <span>·</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {isCash ? 'موجودی نقدی' : cardObj?.title || 'کارت بانکی'}
                        </span>
                        <span>·</span>
                        <span>
                          {formatJalaliReadable(tx.jalaliDate)} ({toPersianDigits(tx.time)})
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
        )}
      </div>

      {modalNode}
    </div>
  );
};
