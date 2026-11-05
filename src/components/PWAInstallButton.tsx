import React, { useState } from 'react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';
import { CircularIcon } from './CircularIcon';
import { detectGitHubPagesRepo } from '../utils/githubSync';

interface PWAInstallButtonProps {
  repoOwner?: string;
  repoName?: string;
  variant?: 'header' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  repoOwner,
  repoName,
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const autoRepo = detectGitHubPagesRepo();
  const finalOwner = repoOwner || autoRepo.repoOwner || 'baraary';
  const finalRepo = repoName || autoRepo.repoName || 'hhsb';
  const githubPagesUrl = `https://${finalOwner}.github.io/${finalRepo}/`;
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(
    githubPagesUrl
  )}`;

  const handlePrimaryClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setIsModalOpen(true);
  };

  if (variant === 'header' && isInstalled) {
    return null;
  }

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={handlePrimaryClick}
          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-extrabold transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          title="نصب وب‌اپ یا دریافت فایل APK اندروید"
        >
          <span>📲 نصب اپ / APK</span>
        </button>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CircularIcon name="smartphone" size="sm" color="#10b981" />
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  نصب روی گوشی (وب‌اپ تمام‌صفحه PWA + فایل نصبی APK اندروید)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  بدون نوار آدرس مرورگر، با آیکون اختصاصی و پشتیبانی آفلاین
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePrimaryClick}
              className="px-3.5 py-2 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer whitespace-nowrap shrink-0"
            >
              {isInstallable ? 'نصب مستقیم روی گوشی 📲' : 'راهنمای نصب و دریافت APK 📲'}
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <CircularIcon name="smartphone" size="md" color="#10b981" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    نصب اپلیکیشن «هم‌حساب» روی گوشی
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    نصب به صورت وب‌اپ استاندارد (PWA) یا دریافت فایل `.apk` اندروید
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

            {/* Method 1: Native PWA Install */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  روش اول: نصب مستقیم وب‌اپ (PWA تمام‌صفحه)
                </span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  پیشنهادی · آپدیت خودکار
                </span>
              </div>

              {isInstallable ? (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await install();
                    if (ok) setIsModalOpen(false);
                  }}
                  className="w-full py-3 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer shadow-sm"
                >
                  نصب فوری اپلیکیشن روی صفحه اصلی گوشی 📲
                </button>
              ) : isIOS ? (
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
                  <p>برای نصب روی آیفون (Safari):</p>
                  <p>۱. در نوار پایین مرورگر سافاری روی دکمه <strong>Share (مربع با فلش رو به بالا)</strong> بزنید.</p>
                  <p>۲. گزینه <strong>Add to Home Screen</strong> را انتخاب کرده و <strong>Add</strong> را بزنید.</p>
                </div>
              ) : (
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
                  <p>برای نصب روی اندروید (در مرورگر Chrome):</p>
                  <p>۱. آدرس گیت‌هاب خودتان (<code>{githubPagesUrl}</code>) را در کروم گوشی باز کنید.</p>
                  <p>۲. روی <strong>منوی سه‌نقطه بالا (⋮)</strong> بزنید و گزینه <strong>Install app (نصب برنامه)</strong> یا <strong>Add to Home screen</strong> را انتخاب کنید تا دقیقاً مثل یک اپ مستقل بدون نوار مرورگر نصب شود.</p>
                </div>
              )}
            </div>

            {/* Method 2: Build & Download Real Android APK File */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  روش دوم: دریافت فایل نصبی اندروید (`.apk`)
                </span>
                <span className="text-[11px] font-bold text-sky-500">
                  فایل APK مستقل
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                ما فایل‌های استاندارد `manifest.json`، آیکون‌های ۵۱۲ پیکسلی و سرویس‌ورکر را به ریپازیتوری گیت‌هاب شما اضافه کردیم. بنابراین می‌توانید با ابزار رسمی و رایگان **PWABuilder مایکروسافت** در ۲۰ ثانیه فایل `.apk` امضاشده بگیرید:
              </p>

              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>ابتدا تغییرات جدید را به گیت‌هاب Push کنید تا سایت <code>{finalRepo}</code> آپدیت شود.</li>
                <li>روی دکمه زیر بزنید تا سایت شما در <strong>PWABuilder</strong> باز شود.</li>
                <li>روی دکمه <strong>Package for store</strong> و سپس زیر <strong>Android</strong> روی <strong>Download Package</strong> بزنید تا فایل <code>.apk</code> دانلود شود!</li>
              </ol>

              <a
                href={pwaBuilderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-opacity"
              >
                <span>ساخت و دانلود فایل APK از PWABuilder (رایگان) 📦</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-18 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-extrabold text-white shadow-lg">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>حالت آفلاین — اطلاعات در حافظه گوشی ذخیره می‌شود</span>
    </div>
  );
};
