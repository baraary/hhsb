import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Smartphone, Download, Package, X } from 'lucide-react';
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
  const directApkUrl =
    typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io')
      ? './hamhesab.apk'
      : `${githubPagesUrl}hamhesab.apk`;

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

  const modalNode =
    isModalOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            data-no-swipe="true"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4"
          >
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-2xl text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center gap-3">
                  <CircularIcon name="smartphone" size="md" color="#10b981" />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      نصب اپلیکیشن «هم‌حساب» روی گوشی
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      دانلود مستقیم فایل `.apk` از گیت‌هاب خودتان یا نصب وب‌اپ (PWA)
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

              {/* Method 1: Direct Android APK Download from GitHub Pages */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                    روش اول: دانلود مستقیم فایل نصبی اندروید (`hamhesab.apk`)
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    ساخت خودکار در گیت‌هاب شما
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  گیت‌هاب اکشنز (GitHub Actions) در هر بار آپدیت، به‌صورت کاملاً خودکار فایل اندروید{' '}
                  <code className="font-sans font-bold">hamhesab.apk</code> را می‌سازد و امضا می‌کند و مستقیم داخل سایت خودتان قرار می‌دهد:
                </p>

                <a
                  href={directApkUrl}
                  download="hamhesab.apk"
                  className="w-full py-3 px-4 rounded-xl theme-bg text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-opacity"
                >
                  <Download size={15} strokeWidth={2.4} />
                  <span>دانلود مستقیم فایل hamhesab.apk (اندروید)</span>
                </a>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  لینک مستقیم دانلود:{' '}
                  <code className="font-sans select-all text-slate-700 dark:text-slate-200">
                    {githubPagesUrl}hamhesab.apk
                  </code>
                </p>
              </div>

              {/* Method 2: Native PWA Install */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                    روش دوم: نصب مستقیم وب‌اپ (PWA تمام‌صفحه برای اندروید و آیفون)
                  </span>
                  <span className="text-[11px] font-bold text-sky-500">
                    بدون نیاز به نصب APK
                  </span>
                </div>

                {isInstallable ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await install();
                      if (ok) setIsModalOpen(false);
                    }}
                    className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold cursor-pointer shadow-sm flex items-center justify-center gap-2"
                  >
                    <Smartphone size={15} strokeWidth={2.4} />
                    <span>نصب فوری وب‌اپ روی صفحه اصلی گوشی</span>
                  </button>
                ) : isIOS ? (
                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
                    <p>برای نصب روی آیفون (Safari):</p>
                    <p>۱. در نوار پایین مرورگر سافاری روی دکمه <strong>Share</strong> بزنید.</p>
                    <p>۲. گزینه <strong>Add to Home Screen</strong> را انتخاب کرده و <strong>Add</strong> را بزنید.</p>
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
                    <p>در مرورگر Chrome گوشی:</p>
                    <p>۱. آدرس گیت‌هاب خودتان (<code>{githubPagesUrl}</code>) را باز کنید.</p>
                    <p>۲. روی <strong>منوی سه‌نقطه بالا</strong> بزنید و گزینه <strong>Add to Home screen</strong> یا <strong>Install app</strong> را انتخاب کنید.</p>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={handlePrimaryClick}
          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-extrabold transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          title="نصب وب‌اپ یا دانلود مستقیم فایل APK اندروید"
        >
          <Smartphone size={14} strokeWidth={2.3} />
          <span>نصب اپ / APK</span>
        </button>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <CircularIcon name="smartphone" size="sm" color="#10b981" />
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  نصب روی گوشی (دانلود مستقیم فایل APK اندروید + وب‌اپ تمام‌صفحه)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ساخته شده به‌صورت خودکار روی گیت‌هاب شما بدون نیاز به هیچ سایت دیگر
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={directApkUrl}
                download="hamhesab.apk"
                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <Package size={14} strokeWidth={2.3} />
                <span>دانلود مستقیم APK</span>
              </a>
              <button
                type="button"
                onClick={handlePrimaryClick}
                className="px-3.5 py-2 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <Smartphone size={14} strokeWidth={2.3} />
                <span>{isInstallable ? 'نصب وب‌اپ' : 'راهنمای نصب'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {modalNode}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-18 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-extrabold text-white shadow-lg">
      <CircularIcon name="refresh" size="xs" variant="glass" />
      <span>حالت آفلاین — اطلاعات در حافظه گوشی ذخیره می‌شود</span>
    </div>
  );
};
