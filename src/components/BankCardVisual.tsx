import React, { useState } from 'react';
import { Shuffle, Check, Copy } from 'lucide-react';
import { BankCard, Transaction } from '../types';
import { IRANIAN_BANKS, BankLogoVector, detectBankByText } from '../utils/iranianBanks';
import {
  resolveCardGradient,
  resolveCardPattern,
  CardVectorPatternOverlay,
} from '../utils/cardThemesAndPatterns';
import { formatCardNumber, formatMoney, toPersianDigits } from '../utils/persian';
import { CircularIcon } from './CircularIcon';

interface BankCardVisualProps {
  card: BankCard;
  transactions: Transaction[];
  currencyUnit: string;
  isMonochrome?: boolean;
  onEdit?: (card: BankCard) => void;
  onRandomizeStyle?: (card: BankCard) => void;
  compact?: boolean;
}

export const BankCardVisual: React.FC<BankCardVisualProps> = ({
  card,
  transactions,
  currencyUnit,
  isMonochrome = false,
  onEdit,
  onRandomizeStyle,
  compact = false,
}) => {
  const [copied, setCopied] = useState<'card' | 'sheba' | null>(null);
  const titleBankId = detectBankByText(card.title || '');
  const effectiveBankId =
    card.bankId === 'mellat' && titleBankId && titleBankId !== 'mellat'
      ? titleBankId
      : card.bankId;
  const bank = IRANIAN_BANKS[effectiveBankId] || IRANIAN_BANKS.other;

  const cardIncome = transactions
    .filter((t) => t.cardId === card.id && t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const cardExpense = transactions
    .filter((t) => t.cardId === card.id && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = card.initialBalance + cardIncome - cardExpense;

  const gradient = resolveCardGradient({ ...card, bankId: effectiveBankId });
  const patternId = resolveCardPattern(card);

  // If the user explicitly picked a custom color palette for this card, show it even in monochrome theme
  const hasExplicitCustomColor =
    Boolean(card.cardColorTheme) && card.cardColorTheme !== 'auto';
  const useMonochromeSurface = isMonochrome && !hasExplicitCustomColor;

  const handleCopy = (text: string, type: 'card' | 'sheba', e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1800);
  };

  const customStyle = useMonochromeSurface
    ? undefined
    : {
        background: `linear-gradient(135deg, ${gradient.from}eb 0%, ${gradient.via}e6 50%, ${gradient.to}f0 100%)`,
      };

  return (
    <div
      style={customStyle}
      className={`relative overflow-hidden rounded-3xl text-white transition-all duration-200 select-none ${
        useMonochromeSurface ? 'monochrome-bank-card' : 'glass-bank-card'
      } ${compact ? 'p-4' : 'px-4 py-4 sm:px-5 sm:py-4.5'}`}
    >
      {/* Top Frosted Glass Specular Edge Highlight */}
      <div className="absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none z-10" />

      {/* Rich SVG Vector Pattern Overlay + Pastel Glass Sheen */}
      <CardVectorPatternOverlay
        patternId={patternId}
        accentColor={useMonochromeSurface ? '#e4e4e7' : gradient.accent}
      />

      {/* Top Row: Bank Logo + Bank Name + Card Title + Quick Randomize & Edit */}
      <div className="relative z-10 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <BankLogoVector
            bankId={effectiveBankId}
            size={compact ? 34 : 38}
            mono={useMonochromeSurface}
          />
          <div className="min-w-0">
            <h4 className="font-extrabold text-xs sm:text-sm tracking-tight text-white truncate drop-shadow-2xs">
              {card.title || bank.name}
            </h4>
            <p className="text-[11px] text-white/85 font-medium truncate">
              {bank.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onRandomizeStyle && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRandomizeStyle(card);
              }}
              title="تغییر تصادفی رنگ پاستیلی و پترن وکتور کارت"
              className="px-2.5 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center gap-1.5 text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Shuffle size={13} strokeWidth={2.3} />
              <span>طرح رندوم</span>
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(card)}
              title="ویرایش کارت و انتخاب رنگ/پترن"
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center transition-colors cursor-pointer"
            >
              <CircularIcon name="edit" size="xs" variant="glass" />
            </button>
          )}
        </div>
      </div>

      {/* Middle Row: Balance & Frosted Metallic EMV Chip */}
      <div className="relative z-10 flex items-end justify-between mt-3.5">
        <div>
          <span className="text-[11px] text-white/80 block">موجودی فعلی کارت</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg sm:text-xl font-black tabular-nums tracking-tight drop-shadow-2xs">
              {formatMoney(currentBalance)}
            </span>
            <span className="text-[11px] text-white/90 font-normal">
              {currencyUnit}
            </span>
          </div>
        </div>

        {/* Sleek Frosted Metallic EMV Chip */}
        <div
          className={`w-10 h-7 rounded-lg opacity-95 border flex items-center justify-center shadow-inner backdrop-blur-xs ${
            useMonochromeSurface
              ? 'bg-gradient-to-br from-zinc-200/90 via-zinc-300/80 to-zinc-400/90 border-white/50'
              : 'bg-gradient-to-br from-amber-100/90 via-amber-200/85 to-amber-400/90 border-white/60'
          }`}
        >
          <div className="w-7 h-4.5 border border-black/20 rounded-xs grid grid-cols-2 gap-0.5 p-0.5">
            <div className="border-r border-b border-black/20" />
            <div className="border-b border-black/20" />
            <div className="border-r border-black/20" />
            <div />
          </div>
        </div>
      </div>

      {/* Frosted Glass Card Number Row (LTR formatted) */}
      <div className="relative z-10 mt-3">
        <div
          dir="ltr"
          onClick={(e) => handleCopy(card.cardNumber, 'card', e)}
          className="flex items-center justify-between bg-white/16 hover:bg-white/24 backdrop-blur-md rounded-2xl px-3.5 py-2 border border-white/30 shadow-inner cursor-pointer transition-colors"
        >
          <span className="font-sans text-xs sm:text-sm font-bold tracking-widest tabular-nums text-white drop-shadow-2xs">
            {formatCardNumber(card.cardNumber)}
          </span>
          <span className="text-[10px] text-white/95 font-sans flex items-center gap-1 font-bold">
            {copied === 'card' ? (
              <>
                <Check size={12} strokeWidth={2.5} />
                <span>کپی شد</span>
              </>
            ) : (
              <>
                <Copy size={11} strokeWidth={2.2} />
                <span>کپی شماره</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Bottom Metadata: Sheba + Expiry + Income/Expense summary */}
      {!compact && (
        <div className="relative z-10 mt-2.5 pt-2 border-t border-white/25 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/90">
          <div className="flex items-center gap-2.5">
            <span>انقضا: {toPersianDigits(card.expiryDate || '06/05')}</span>
            {card.shebaNumber && (
              <>
                <span className="text-white/50">·</span>
                <button
                  type="button"
                  onClick={(e) => handleCopy(card.shebaNumber!, 'sheba', e)}
                  className="hover:text-white underline decoration-white/50 underline-offset-4 cursor-pointer tabular-nums flex items-center gap-1"
                >
                  {copied === 'sheba' ? (
                    <>
                      <Check size={11} strokeWidth={2.5} />
                      <span>شبا کپی شد</span>
                    </>
                  ) : (
                    <span>{card.shebaNumber.slice(0, 10)}...</span>
                  )}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 tabular-nums">
            <span
              className={
                useMonochromeSurface
                  ? 'text-zinc-100 font-bold'
                  : 'text-emerald-100 font-extrabold'
              }
            >
              +{formatMoney(cardIncome)}
            </span>
            <span className="text-white/50">/</span>
            <span
              className={
                useMonochromeSurface
                  ? 'text-zinc-200 font-bold'
                  : 'text-rose-100 font-extrabold'
              }
            >
              -{formatMoney(cardExpense)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
