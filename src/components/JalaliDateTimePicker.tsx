import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, X, Plus, Minus } from 'lucide-react';
import {
  JALALI_MONTHS,
  toPersianDigits,
  toEnglishDigits,
  formatJalaliReadable,
  getCurrentTimeStr,
} from '../utils/persian';
import { CircularIcon } from './CircularIcon';

interface JalaliDateTimePickerProps {
  jalaliDate: string; // YYYY/MM/DD
  time: string; // HH:mm
  onChangeDate: (date: string) => void;
  onChangeTime: (time: string) => void;
}

export const JalaliDateTimePicker: React.FC<JalaliDateTimePickerProps> = ({
  jalaliDate,
  time,
  onChangeDate,
  onChangeTime,
}) => {
  const [activePopup, setActivePopup] = useState<'date' | 'time' | null>(null);

  const parts = (jalaliDate || '1403/08/14').split('/');
  const yearNum = parseInt(parts[0] || '1403', 10);
  const monthNum = parseInt(parts[1] || '8', 10);
  const dayNum = parseInt(parts[2] || '14', 10);

  const timeParts = (time || '19:30').split(':');
  const hourNum = parseInt(timeParts[0] || '19', 10);
  const minuteNum = parseInt(timeParts[1] || '30', 10);

  const maxDaysInMonth = (m: number) => (m <= 6 ? 31 : m <= 11 ? 30 : 29);

  const updateDateParts = (y: number, m: number, d: number) => {
    const validY = Math.max(1395, Math.min(1410, y));
    const validM = Math.max(1, Math.min(12, m));
    const maxD = maxDaysInMonth(validM);
    const validD = Math.max(1, Math.min(maxD, d));
    onChangeDate(
      `${validY}/${String(validM).padStart(2, '0')}/${String(validD).padStart(2, '0')}`
    );
  };

  const stepDay = (delta: number) => {
    let y = yearNum;
    let m = monthNum;
    let d = dayNum + delta;
    if (d < 1) {
      m -= 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      d = maxDaysInMonth(m);
    } else if (d > maxDaysInMonth(m)) {
      d = 1;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    updateDateParts(y, m, d);
  };

  // 1-by-1 Hour and Minute helpers
  const setExactTime = (h: number, m: number) => {
    const validH = ((h % 24) + 24) % 24;
    const validM = ((m % 60) + 60) % 60;
    onChangeTime(
      `${String(validH).padStart(2, '0')}:${String(validM).padStart(2, '0')}`
    );
  };

  const stepMinuteOneByOne = (delta: number) => {
    let nextM = minuteNum + delta;
    let nextH = hourNum;
    if (nextM >= 60) {
      nextM = 0;
      nextH = (nextH + 1) % 24;
    } else if (nextM < 0) {
      nextM = 59;
      nextH = (nextH - 1 + 24) % 24;
    }
    setExactTime(nextH, nextM);
  };

  const currentMonthObj =
    JALALI_MONTHS.find((m) => parseInt(m.number, 10) === monthNum) || JALALI_MONTHS[7];

  return (
    <div className="space-y-2.5">
      {/* Main Row: Date Picker Trigger + Compact 2-Box Time Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Date Trigger Card */}
        <div
          onClick={() => setActivePopup(activePopup === 'date' ? null : 'date')}
          className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
            activePopup === 'date'
              ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
              : 'border-slate-200 dark:border-slate-700/80 bg-slate-100/80 dark:bg-slate-800/70 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CircularIcon name="calendar" size="sm" color="#10b981" />
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                تاریخ تراکنش
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                {formatJalaliReadable(jalaliDate)}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold theme-text flex items-center gap-1">
            <span>{activePopup === 'date' ? 'بستن' : 'تغییر تاریخ'}</span>
            {activePopup === 'date' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>

        {/* Direct 2-Box Time Control */}
        <div className="flex items-center justify-between p-2.5 px-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-100/80 dark:bg-slate-800/70">
          <div className="flex items-center gap-2">
            <CircularIcon name="clock" size="sm" color="#0ea5e9" />
            <div className="hidden xs:block">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                ساعت و دقیقه
              </span>
              <button
                type="button"
                onClick={() => onChangeTime(getCurrentTimeStr())}
                className="text-[10px] font-bold text-sky-500 hover:underline cursor-pointer"
              >
                ساعت الان
              </button>
            </div>
          </div>

          <div dir="ltr" className="flex items-center gap-1.5">
            {/* Hour Box with - / + */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-1.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setExactTime(hourNum - 1, minuteNum)}
                className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer active:scale-95"
                title="کاهش ساعت"
              >
                <Minus size={12} strokeWidth={2.5} />
              </button>
              <input
                type="text"
                inputMode="numeric"
                aria-label="ساعت"
                value={toPersianDigits(String(hourNum).padStart(2, '0'))}
                onChange={(e) => {
                  const raw = toEnglishDigits(e.target.value).replace(/\D/g, '');
                  const val = parseInt(raw || '0', 10);
                  setExactTime(Math.min(23, Math.max(0, val)), minuteNum);
                }}
                className="w-8 h-6 text-center text-xs sm:text-sm font-black tabular-nums bg-transparent text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setExactTime(hourNum + 1, minuteNum)}
                className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer active:scale-95"
                title="افزایش ساعت"
              >
                <Plus size={12} strokeWidth={2.5} />
              </button>
            </div>

            <span className="text-sm font-black text-slate-400">:</span>

            {/* Minute Box with - / + (1 by 1) */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-1.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => stepMinuteOneByOne(-1)}
                className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer active:scale-95"
                title="کاهش دقیقه"
              >
                <Minus size={12} strokeWidth={2.5} />
              </button>
              <input
                type="text"
                inputMode="numeric"
                aria-label="دقیقه"
                value={toPersianDigits(String(minuteNum).padStart(2, '0'))}
                onChange={(e) => {
                  const raw = toEnglishDigits(e.target.value).replace(/\D/g, '');
                  const val = parseInt(raw || '0', 10);
                  setExactTime(hourNum, Math.min(59, Math.max(0, val)));
                }}
                className="w-8 h-6 text-center text-xs sm:text-sm font-black tabular-nums bg-transparent text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => stepMinuteOneByOne(1)}
                className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer active:scale-95"
                title="افزایش دقیقه"
              >
                <Plus size={12} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* EXPANDABLE JALALI CALENDAR POPOVER */}
      {activePopup === 'date' && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
          {/* Quick Presets + Year/Month Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateDateParts(yearNum - 1, monthNum, dayNum)}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                سال قبل
              </button>
              <span className="text-xs font-black px-2 tabular-nums text-slate-900 dark:text-white">
                سال {toPersianDigits(yearNum)}
              </span>
              <button
                type="button"
                onClick={() => updateDateParts(yearNum + 1, monthNum, dayNum)}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                سال بعد
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onChangeDate('1403/08/14');
                  setActivePopup(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold cursor-pointer"
              >
                امروز
              </button>
              <button
                type="button"
                onClick={() => stepDay(-1)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer"
              >
                دیروز
              </button>
            </div>
          </div>

          {/* 12 Months Selector */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
            {JALALI_MONTHS.map((m) => {
              const mIdx = parseInt(m.number, 10);
              const isSelected = monthNum === mIdx;
              return (
                <button
                  key={m.number}
                  type="button"
                  onClick={() => updateDateParts(yearNum, mIdx, dayNum)}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isSelected
                      ? 'theme-bg text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>

          {/* Days of Month Grid */}
          <div>
            <div className="text-[11px] text-slate-400 mb-1.5">
              انتخاب روز در {currentMonthObj.name} {toPersianDigits(yearNum)}:
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: maxDaysInMonth(monthNum) }, (_, i) => i + 1).map(
                (d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      updateDateParts(yearNum, monthNum, d);
                      setActivePopup(null);
                    }}
                    className={`h-9 rounded-xl text-xs font-extrabold tabular-nums flex items-center justify-center transition-all cursor-pointer ${
                      dayNum === d
                        ? 'theme-bg text-white shadow-sm scale-105'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {toPersianDigits(d)}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface JalaliDateInputProps {
  value: string; // YYYY/MM/DD or empty
  onChange: (newDate: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  label?: string;
}

export const JalaliDateInput: React.FC<JalaliDateInputProps> = ({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ...',
  allowClear = false,
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const defaultDate = value && value.includes('/') ? value : '1403/08/14';
  const parts = defaultDate.split('/');
  const [viewYear, setViewYear] = useState<number>(parseInt(parts[0] || '1403', 10));
  const [viewMonth, setViewMonth] = useState<number>(parseInt(parts[1] || '8', 10));
  const selectedDay = value ? parseInt(parts[2] || '0', 10) : 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const maxDays = viewMonth <= 6 ? 31 : viewMonth <= 11 ? 30 : 29;
  const currentMonthName =
    JALALI_MONTHS.find((m) => parseInt(m.number, 10) === viewMonth)?.name || 'آبان';

  const handleSelectDay = (d: number) => {
    const formatted = `${viewYear}/${String(viewMonth).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
    onChange(formatted);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between gap-1.5 cursor-pointer hover:border-emerald-500 transition-colors"
      >
        <span className={`tabular-nums truncate ${value ? '' : 'text-slate-400 font-normal'}`}>
          {value ? formatJalaliReadable(value) : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {allowClear && value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="text-rose-500 hover:text-rose-600 p-0.5 cursor-pointer flex items-center justify-center"
              title="پاک کردن تاریخ"
            >
              <X size={13} strokeWidth={2.5} />
            </button>
          )}
          <CircularIcon name="calendar" size="xs" color="#10b981" />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 right-0 left-0 min-w-[260px] p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-2.5">
          {/* Year & Month Switcher */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold cursor-pointer"
            >
              سال قبل
            </button>
            <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
              {currentMonthName} {toPersianDigits(viewYear)}
            </span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold cursor-pointer"
            >
              سال بعد
            </button>
          </div>

          {/* Month Pills */}
          <div className="grid grid-cols-4 gap-1">
            {JALALI_MONTHS.map((m) => {
              const mNum = parseInt(m.number, 10);
              return (
                <button
                  key={m.number}
                  type="button"
                  onClick={() => setViewMonth(mNum)}
                  className={`py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                    viewMonth === mNum
                      ? 'theme-bg text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 pt-1">
            {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleSelectDay(d)}
                className={`h-7 rounded-lg text-[11px] font-bold tabular-nums flex items-center justify-center cursor-pointer ${
                  selectedDay === d
                    ? 'theme-bg text-white'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {toPersianDigits(d)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
