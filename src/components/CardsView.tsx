import React, { useState } from 'react';
import { AppState, BankCard, IranianBankId, PersonId } from '../types';
import { BankCardVisual } from './BankCardVisual';
import {
  IRANIAN_BANKS,
  BankLogoVector,
  detectBankByCardNumber,
} from '../utils/iranianBanks';
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
  const [ownerFilter, setOwnerFilter] = useState<'all' | PersonId>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<BankCard | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [bankId, setBankId] = useState<IranianBankId>('mellat');
  const [shebaNumber, setShebaNumber] = useState('');
  const [owner, setOwner] = useState<PersonId>('hootan');
  const [initialBalanceStr, setInitialBalanceStr] = useState('0');
  const [expiryDate, setExpiryDate] = useState('06/05');
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingCard(null);
    setTitle('');
    setCardNumber('');
    setBankId('mellat');
    setShebaNumber('');
    setOwner('hootan');
    setInitialBalanceStr('0');
    setExpiryDate('06/05');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (card: BankCard) => {
    setEditingCard(card);
    setTitle(card.title);
    setCardNumber(card.cardNumber);
    setBankId(card.bankId);
    setShebaNumber(card.shebaNumber || '');
    setOwner(card.owner);
    setInitialBalanceStr(String(card.initialBalance));
    setExpiryDate(card.expiryDate);
    setFormError('');
    setIsModalOpen(true);
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
    if (!title.trim()) {
      setFormError('لطفاً عنوان کارت را وارد کنید.');
      return;
    }
    if (cardNumber.length < 16) {
      setFormError('شماره کارت باید ۱۶ رقم کامل باشد.');
      return;
    }

    onSaveCard(
      {
        title: title.trim(),
        bankId,
        cardNumber,
        shebaNumber: shebaNumber.trim() || undefined,
        owner,
        initialBalance: parseInt(toEnglishDigits(initialBalanceStr).replace(/\D/g, '') || '0', 10),
        expiryDate,
      },
      editingCard?.id
    );
    setIsModalOpen(false);
  };

  const filteredCards = cards.filter((c) =>
    ownerFilter === 'all' ? true : c.owner === ownerFilter
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Owner Filter */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CircularIcon name="credit-card" size="md" color="#0ea5e9" />
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              کارت‌های بانکی شبکه شتاب
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تشخیص هوشمند لوگوی بانک‌های ایرانی و محاسبه موجودی لحظه‌ای هر کارت
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-2xl theme-gradient text-white text-xs font-extrabold shadow-md hover:opacity-95 transition-all cursor-pointer whitespace-nowrap"
          >
            + افزودن کارت بانکی جدید
          </button>
        </div>
      </div>

      {/* Filter Tabs by Card Owner */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 w-fit">
        {(
          [
            { id: 'all', label: `همه کارت‌ها (${toPersianDigits(cards.length)})` },
            { id: 'hootan', label: `کارت‌های ${settings.hootanName}` },
            { id: 'fatemeh', label: `کارت‌های ${settings.fatemehName}` },
            { id: 'shared', label: `کارت‌های ${settings.sharedLabel}` },
          ] as { id: 'all' | PersonId; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setOwnerFilter(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              ownerFilter === tab.id
                ? 'theme-bg text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bank Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCards.map((card) => {
          const cardTxs = transactions.filter((t) => t.cardId === card.id);
          return (
            <div key={card.id} className="space-y-1.5">
              <BankCardVisual
                card={card}
                transactions={transactions}
                hootanName={settings.hootanName}
                fatemehName={settings.fatemehName}
                sharedLabel={settings.sharedLabel}
                currencyUnit={settings.currencyUnit}
                isMonochrome={settings.colorTheme === 'monochrome'}
                onEdit={openEditModal}
              />
              <div className="px-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  تعداد تراکنش‌های ثبت شده روی این کارت: {toPersianDigits(cardTxs.length)} مورد
                </span>
                {cards.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteCard(card.id)}
                    className="text-rose-500 hover:underline font-semibold cursor-pointer"
                  >
                    حذف کارت
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for Adding / Editing Iranian Bank Card */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <BankLogoVector
                  bankId={bankId}
                  size={34}
                  mono={settings.colorTheme === 'monochrome'}
                />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {editingCard ? 'ویرایش مشخصات کارت بانکی' : 'ثبت کارت بانکی جدید'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    با وارد کردن ۶ رقم اول، بانک به صورت خودکار شناسایی می‌شود
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                بستن
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  شماره ۱۶ رقمی کارت
                </label>
                <input
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  placeholder="6104337812345678"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-base font-bold tracking-widest text-center text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    عنوان دلخواه کارت
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثلاً: ملت حقوق هوتن"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    مالکیت کارت
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
                    {(
                      [
                        { id: 'hootan', label: settings.hootanName },
                        { id: 'fatemeh', label: settings.fatemehName },
                        { id: 'shared', label: settings.sharedLabel },
                      ] as { id: PersonId; label: string }[]
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setOwner(p.id)}
                        className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${
                          owner === p.id
                            ? 'theme-bg text-white'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Iranian Bank Selector Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  انتخاب بانک صادرکننده (لوگوی وکتور دایره‌ای)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
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
                      <BankLogoVector bankId={b.id} size={26} />
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
                        ? formatMoney(parseInt(toEnglishDigits(initialBalanceStr).replace(/\D/g, '') || '0', 10))
                        : '۰'
                    }
                    onChange={(e) =>
                      setInitialBalanceStr(toEnglishDigits(e.target.value).replace(/\D/g, ''))
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
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
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
        </div>
      )}
    </div>
  );
};
