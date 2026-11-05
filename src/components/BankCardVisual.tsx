import React, { useState } from 'react';
import { BankCard, Transaction } from '../types';
import { IRANIAN_BANKS, BankLogoVector } from '../utils/iranianBanks';
import { formatCardNumber, formatMoney, toPersianDigits } from '../utils/persian';
import { CircularIcon } from './CircularIcon';

interface BankCardVisualProps {
  card: BankCard;
  transactions: Transaction[];
  hootanName: string;
  fatemehName: string;
  sharedLabel: string;
  currencyUnit: string;
  isMonochrome?: boolean;
  onEdit?: (card: BankCard) => void;
  compact?: boolean;
}

export const BankCardVisual: React.FC<BankCardVisualProps> = ({
  card,
  transactions,
  hootanName,
  fatemehName,
  sharedLabel,
  currencyUnit,
  isMonochrome = false,
  onEdit,
  compact = false,
}) => {
  const [copied, setCopied] = useState<'card' | 'sheba' | null>(null);
  const bank = IRANIAN_BANKS[card.bankId] || IRANIAN_BANKS.other;

  const cardIncome = transactions
    .filter((t) => t.cardId === card.id && t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const cardExpense = transactions
    .filter((t) => t.cardId === card.id && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = card.initialBalance + cardIncome - cardExpense;

  const ownerLabel =
    card.owner === 'hootan'
      ? hootanName
      : card.owner === 'fatemeh'
      ? fatemehName
      : sharedLabel;

  const handleCopy = (text: string, type: 'card' | 'sheba', e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1800);
  };

  const customStyle = isMonochrome
    ? undefined
    : {
        background: `linear-gradient(135deg, ${bank.gradientFrom} 0%, ${bank.gradientVia} 50%, ${bank.gradientTo} 100%)`,
      };

  return (
    <div
      style={customStyle}
      className={`relative overflow-hidden rounded-2xl text-white shadow-md transition-transform duration-200 select-none ${
        isMonochrome
          ? 'monochrome-bank-card'
          : 'border border-white/15 dark:border-white/25'
      } ${compact ? 'p-3.5' : 'px-4 py-3.5 sm:px-5 sm:py-4'}`}
    >
      {/* Subtle geometric pattern overlay */}
      <div
        className="absolute -left-10 -top-10 w-36 h-36 rounded-full opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${
            isMonochrome ? '#e4e4e7' : bank.accentColor
          }, transparent 70%)`,
        }}
      />

      {/* Top Row: Sleeker Bank Logo + Bank Name + Owner + Edit */}
      <div className="relative z-10 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <BankLogoVector
            bankId={card.bankId}
            size={compact ? 30 : 34}
            mono={isMonochrome}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-xs sm:text-sm tracking-tight text-white">
                {bank.name}
              </h4>
              <span className="text-[11px] text-white/70">·</span>
              <span className="text-[11px] font-medium text-white/90">{ownerLabel}</span>
            </div>
            <p className="text-[11px] text-white/75">{card.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(card)}
              title="ویرایش کارت"
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
            >
              <CircularIcon name="edit" size="xs" variant="glass" />
            </button>
          )}
        </div>
      </div>

      {/* Middle Row: Balance & Compact Chip */}
      <div className="relative z-10 flex items-end justify-between mt-3">
        <div>
          <span className="text-[11px] text-white/75 block">موجودی فعلی کارت</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg sm:text-xl font-extrabold tabular-nums tracking-tight">
              {formatMoney(currentBalance)}
            </span>
            <span className="text-[11px] text-white/80 font-normal">{currencyUnit}</span>
          </div>
        </div>

        {/* Sleek EMV Chip */}
        <div
          className={`w-9 h-6 rounded-md opacity-90 border flex items-center justify-center shadow-inner ${
            isMonochrome
              ? 'bg-gradient-to-br from-zinc-200 via-zinc-400 to-zinc-500 border-zinc-100/40'
              : 'bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 border-amber-100/40'
          }`}
        >
          <div className="w-6 h-4 border border-black/25 rounded-xs grid grid-cols-2 gap-0.5 p-0.5">
            <div className="border-r border-b border-black/20" />
            <div className="border-b border-black/20" />
            <div className="border-r border-black/20" />
            <div />
          </div>
        </div>
      </div>

      {/* Card Number Row (LTR formatted, slimmer height) */}
      <div className="relative z-10 mt-3">
        <div
          dir="ltr"
          onClick={(e) => handleCopy(card.cardNumber, 'card', e)}
          className="flex items-center justify-between bg-black/20 hover:bg-black/30 backdrop-blur-xs rounded-xl px-3 py-2 border border-white/10 cursor-pointer transition-colors"
        >
          <span className="font-mono text-xs sm:text-sm font-semibold tracking-widest tabular-nums text-white">
            {formatCardNumber(card.cardNumber)}
          </span>
          <span className="text-[10px] text-white/80 font-sans">
            {copied === 'card' ? 'کپی شد ✓' : 'کپی شماره'}
          </span>
        </div>
      </div>

      {/* Bottom Metadata: Sheba + Expiry + Income/Expense summary */}
      {!compact && (
        <div className="relative z-10 mt-2.5 pt-2 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/85">
          <div className="flex items-center gap-2.5">
            <span>انقضا: {toPersianDigits(card.expiryDate || '06/05')}</span>
            {card.shebaNumber && (
              <>
                <span className="text-white/40">·</span>
                <button
                  type="button"
                  onClick={(e) => handleCopy(card.shebaNumber!, 'sheba', e)}
                  className="hover:text-white underline decoration-white/40 underline-offset-4 cursor-pointer tabular-nums"
                >
                  {copied === 'sheba' ? 'شبا کپی شد ✓' : `${card.shebaNumber.slice(0, 10)}...`}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 tabular-nums">
            <span className={isMonochrome ? 'text-zinc-200' : 'text-emerald-200'}>
              +{formatMoney(cardIncome)}
            </span>
            <span className="text-white/40">/</span>
            <span className={isMonochrome ? 'text-zinc-300' : 'text-rose-200'}>
              -{formatMoney(cardExpense)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
