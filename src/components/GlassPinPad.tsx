import React, { useEffect } from 'react';
import { Delete, Fingerprint, Lock } from 'lucide-react';
import { toPersianDigits, toEnglishDigits } from '../utils/persian';

interface GlassPinPadProps {
  value: string;
  onChange: (nextVal: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  onBiometricClick?: () => void;
  showBiometric?: boolean;
  biometricLabel?: string;
  lightMode?: boolean;
}

export const GlassPinPad: React.FC<GlassPinPadProps> = ({
  value,
  onChange,
  disabled = false,
  hasError = false,
  onBiometricClick,
  showBiometric = false,
  biometricLabel = 'اثر انگشت / چهره',
  lightMode = false,
}) => {
  const handleDigitPress = (digit: string) => {
    if (disabled) return;
    if (value.length >= 4) return;
    onChange(value + digit);
  };

  const handleBackspace = () => {
    if (disabled) return;
    if (value.length === 0) return;
    onChange(value.slice(0, -1));
  };

  // Support physical keyboard typing as well
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (value.length > 0) {
          onChange(value.slice(0, -1));
        }
        return;
      }
      const clean = toEnglishDigits(e.key);
      if (/^[0-9]$/.test(clean) && value.length < 4) {
        e.preventDefault();
        onChange(value + clean);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [value, disabled, onChange]);

  const digitsRow1 = ['1', '2', '3'];
  const digitsRow2 = ['4', '5', '6'];
  const digitsRow3 = ['7', '8', '9'];

  const btnBaseClass = lightMode
    ? 'bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-700/80'
    : 'bg-white/8 hover:bg-white/15 active:bg-white/25 text-white border border-white/12 backdrop-blur-md';

  return (
    <div className="space-y-4 select-none">
      {/* 4 Animated PIN Dots Indicator */}
      <div
        dir="ltr"
        className="flex items-center justify-center gap-3.5 py-2"
        aria-label="نشانگر رمز ۴ رقمی"
      >
        {[0, 1, 2, 3].map((idx) => {
          const isFilled = idx < value.length;
          return (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                hasError
                  ? 'bg-rose-500 scale-110 shadow-[0_0_12px_rgba(244,63,94,0.7)]'
                  : isFilled
                  ? 'theme-bg scale-115 shadow-[0_0_14px_rgba(16,185,129,0.7)]'
                  : lightMode
                  ? 'bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600'
                  : 'bg-white/15 border border-white/25'
              }`}
            />
          );
        })}
      </div>

      {/* Numeric Touch Grid (LTR order 1-2-3 so numpad feels standard) */}
      <div dir="ltr" className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
        {[...digitsRow1, ...digitsRow2, ...digitsRow3].map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => handleDigitPress(d)}
            className={`h-13 rounded-2xl font-black text-lg tabular-nums transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center shadow-xs disabled:opacity-40 ${btnBaseClass}`}
          >
            <span>{toPersianDigits(d)}</span>
          </button>
        ))}

        {/* Bottom Left: Biometric or Lock Icon */}
        {showBiometric && onBiometricClick ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onBiometricClick}
            title={biometricLabel}
            className="h-13 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:opacity-40"
          >
            <Fingerprint size={22} />
          </button>
        ) : (
          <div
            className={`h-13 rounded-2xl flex items-center justify-center opacity-40 ${
              lightMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <Lock size={17} />
          </div>
        )}

        {/* Bottom Center: Digit 0 */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigitPress('0')}
          className={`h-13 rounded-2xl font-black text-lg tabular-nums transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-xs disabled:opacity-40 ${btnBaseClass}`}
        >
          <span>{toPersianDigits('0')}</span>
        </button>

        {/* Bottom Right: Backspace */}
        <button
          type="button"
          disabled={disabled || value.length === 0}
          onClick={handleBackspace}
          title="پاک کردن رقم آخر"
          className={`h-13 rounded-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:opacity-30 ${btnBaseClass}`}
        >
          <Delete size={19} />
        </button>
      </div>
    </div>
  );
};
