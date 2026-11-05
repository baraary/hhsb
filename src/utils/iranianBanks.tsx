import React from 'react';
import {
  BankMellatColor,
  BankMellatMono,
  BankMelliColor,
  BankMelliMono,
  BankSamanColor,
  BankSamanMono,
  BankPasargadColor,
  BankPasargadMono,
  BankParsianColor,
  BankParsianMono,
  BankTejaratColor,
  BankTejaratMono,
  BankSaderatColor,
  BankSaderatMono,
  BankMaskanColor,
  BankMaskanMono,
  BankKeshavarziColor,
  BankKeshavarziMono,
  BankSepahColor,
  BankSepahMono,
  BankBlubankColor,
  BankBlubankMono,
  BankResalatColor,
  BankResalatMono,
  BankAyandehColor,
  BankAyandehMono,
  BankShahrColor,
  BankShahrMono,
  BankGardeshgariColor,
  BankGardeshgariMono,
  BankEghtesadNovinColor,
  BankEghtesadNovinMono,
  BankRefahColor,
  BankRefahMono,
  BankMehrIranColor,
  BankMehrIranMono,
  BankSinaColor,
  BankSinaMono,
  BankKarafarinColor,
  BankKarafarinMono,
  BankDeyColor,
  BankDeyMono,
  BankSarmayehColor,
  BankSarmayehMono,
  BankPostbankColor,
  BankPostbankMono,
  BankBankinoColor,
  BankBankinoMono,
  BankIranZaminColor,
  BankIranZaminMono,
  BankKhavarMianehColor,
  BankKhavarMianehMono,
  BankSanatMadanColor,
  BankSanatMadanMono,
  BankToseeTaavonColor,
  BankToseeTaavonMono,
  GatewayShaparakColor,
  GatewayShaparakMono,
} from '@persianlabs/icons/react';
import { IranianBankId } from '../types';

export interface IranianBankInfo {
  id: IranianBankId;
  name: string;
  prefixes: string[];
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  accentColor: string;
  englishName: string;
}

export const IRANIAN_BANKS: Record<IranianBankId, IranianBankInfo> = {
  mellat: {
    id: 'mellat',
    name: 'بانک ملت',
    englishName: 'Bank Mellat',
    prefixes: ['610433', '991975'],
    gradientFrom: '#be123c',
    gradientVia: '#9f1239',
    gradientTo: '#881337',
    accentColor: '#fb7185',
  },
  saman: {
    id: 'saman',
    name: 'بانک سامان',
    englishName: 'Saman Bank',
    prefixes: ['621986'],
    gradientFrom: '#0284c7',
    gradientVia: '#0369a1',
    gradientTo: '#0c4a6e',
    accentColor: '#38bdf8',
  },
  blu: {
    id: 'blu',
    name: 'بلوبانک (سامان)',
    englishName: 'Blu Bank',
    prefixes: ['62198619'],
    gradientFrom: '#2563eb',
    gradientVia: '#1d4ed8',
    gradientTo: '#1e3a8a',
    accentColor: '#60a5fa',
  },
  pasargad: {
    id: 'pasargad',
    name: 'بانک پاسارگاد',
    englishName: 'Bank Pasargad',
    prefixes: ['502229', '639347'],
    gradientFrom: '#b45309',
    gradientVia: '#78350f',
    gradientTo: '#1c1917',
    accentColor: '#fbbf24',
  },
  melli: {
    id: 'melli',
    name: 'بانک ملی ایران',
    englishName: 'Bank Melli Iran',
    prefixes: ['603799'],
    gradientFrom: '#0f766e',
    gradientVia: '#115e59',
    gradientTo: '#134e4a',
    accentColor: '#2dd4bf',
  },
  parsian: {
    id: 'parsian',
    name: 'بانک پارسیان',
    englishName: 'Parsian Bank',
    prefixes: ['622106', '639194', '627884'],
    gradientFrom: '#9a3412',
    gradientVia: '#7c2d12',
    gradientTo: '#431407',
    accentColor: '#fb923c',
  },
  tejarat: {
    id: 'tejarat',
    name: 'بانک تجارت',
    englishName: 'Bank Tejarat',
    prefixes: ['627353', '585983'],
    gradientFrom: '#1e40af',
    gradientVia: '#1e3a8a',
    gradientTo: '#172554',
    accentColor: '#93c5fd',
  },
  saderat: {
    id: 'saderat',
    name: 'بانک صادرات',
    englishName: 'Bank Saderat',
    prefixes: ['603769'],
    gradientFrom: '#1d4ed8',
    gradientVia: '#1e40af',
    gradientTo: '#0f172a',
    accentColor: '#60a5fa',
  },
  maskan: {
    id: 'maskan',
    name: 'بانک مسکن',
    englishName: 'Bank Maskan',
    prefixes: ['628023'],
    gradientFrom: '#ea580c',
    gradientVia: '#c2410c',
    gradientTo: '#7c2d12',
    accentColor: '#fdba74',
  },
  keshavarzi: {
    id: 'keshavarzi',
    name: 'بانک کشاورزی',
    englishName: 'Bank Keshavarzi',
    prefixes: ['603770', '639217'],
    gradientFrom: '#15803d',
    gradientVia: '#166534',
    gradientTo: '#14532d',
    accentColor: '#4ade80',
  },
  sepah: {
    id: 'sepah',
    name: 'بانک سپه',
    englishName: 'Bank Sepah',
    prefixes: ['589210'],
    gradientFrom: '#b91c1c',
    gradientVia: '#991b1b',
    gradientTo: '#450a0a',
    accentColor: '#fca5a5',
  },
  resalat: {
    id: 'resalat',
    name: 'بانک قرض‌الحسنه رسالت',
    englishName: 'Resalat Bank',
    prefixes: ['504172'],
    gradientFrom: '#0891b2',
    gradientVia: '#0e7490',
    gradientTo: '#164e63',
    accentColor: '#67e8f9',
  },
  mehr_iran: {
    id: 'mehr_iran',
    name: 'بانک قرض‌الحسنه مهر ایران',
    englishName: 'Mehr Iran Bank',
    prefixes: ['606373'],
    gradientFrom: '#16a34a',
    gradientVia: '#15803d',
    gradientTo: '#052e16',
    accentColor: '#4ade80',
  },
  ayandeh: {
    id: 'ayandeh',
    name: 'بانک آینده',
    englishName: 'Ayandeh Bank',
    prefixes: ['636214'],
    gradientFrom: '#78350f',
    gradientVia: '#451a03',
    gradientTo: '#27272a',
    accentColor: '#f59e0b',
  },
  shahr: {
    id: 'shahr',
    name: 'بانک شهر',
    englishName: 'Shahr Bank',
    prefixes: ['502806', '504706'],
    gradientFrom: '#dc2626',
    gradientVia: '#991b1b',
    gradientTo: '#3f3f46',
    accentColor: '#f87171',
  },
  gardeshgari: {
    id: 'gardeshgari',
    name: 'بانک گردشگری',
    englishName: 'Tourism Bank',
    prefixes: ['505416'],
    gradientFrom: '#9f1239',
    gradientVia: '#4c0519',
    gradientTo: '#18181b',
    accentColor: '#f43f5e',
  },
  eghtesad_novin: {
    id: 'eghtesad_novin',
    name: 'بانک اقتصاد نوین',
    englishName: 'EN Bank',
    prefixes: ['627412'],
    gradientFrom: '#6b21a8',
    gradientVia: '#581c87',
    gradientTo: '#2e1065',
    accentColor: '#c084fc',
  },
  refah: {
    id: 'refah',
    name: 'بانک رفاه کارگران',
    englishName: 'Refah Bank',
    prefixes: ['589463'],
    gradientFrom: '#3730a3',
    gradientVia: '#312e81',
    gradientTo: '#1e1b4b',
    accentColor: '#818cf8',
  },
  sina: {
    id: 'sina',
    name: 'بانک سینا',
    englishName: 'Sina Bank',
    prefixes: ['639346'],
    gradientFrom: '#1e3a8a',
    gradientVia: '#172554',
    gradientTo: '#0f172a',
    accentColor: '#60a5fa',
  },
  karafarin: {
    id: 'karafarin',
    name: 'بانک کارآفرین',
    englishName: 'Karafarin Bank',
    prefixes: ['627488', '502910'],
    gradientFrom: '#065f46',
    gradientVia: '#064e3b',
    gradientTo: '#022c22',
    accentColor: '#34d399',
  },
  dey: {
    id: 'dey',
    name: 'بانک دی',
    englishName: 'Bank Dey',
    prefixes: ['502938'],
    gradientFrom: '#0f766e',
    gradientVia: '#134e4a',
    gradientTo: '#09090b',
    accentColor: '#2dd4bf',
  },
  sarmayeh: {
    id: 'sarmayeh',
    name: 'بانک سرمایه',
    englishName: 'Sarmayeh Bank',
    prefixes: ['639607'],
    gradientFrom: '#4338ca',
    gradientVia: '#312e81',
    gradientTo: '#1e1b4b',
    accentColor: '#818cf8',
  },
  postbank: {
    id: 'postbank',
    name: 'پست بانک ایران',
    englishName: 'Post Bank Iran',
    prefixes: ['627760'],
    gradientFrom: '#0369a1',
    gradientVia: '#075985',
    gradientTo: '#082f49',
    accentColor: '#38bdf8',
  },
  bankino: {
    id: 'bankino',
    name: 'بانکینو (خاورمیانه)',
    englishName: 'Bankino',
    prefixes: ['58594700'],
    gradientFrom: '#e11d48',
    gradientVia: '#be123c',
    gradientTo: '#4c0519',
    accentColor: '#fb7185',
  },
  izbank: {
    id: 'izbank',
    name: 'بانک ایران زمین',
    englishName: 'Iran Zamin Bank',
    prefixes: ['505785'],
    gradientFrom: '#7e22ce',
    gradientVia: '#581c87',
    gradientTo: '#2e1065',
    accentColor: '#c084fc',
  },
  khavarmianeh: {
    id: 'khavarmianeh',
    name: 'بانک خاورمیانه',
    englishName: 'Middle East Bank',
    prefixes: ['585947'],
    gradientFrom: '#b45309',
    gradientVia: '#92400e',
    gradientTo: '#451a03',
    accentColor: '#fbbf24',
  },
  sanat_madan: {
    id: 'sanat_madan',
    name: 'بانک صنعت و معدن',
    englishName: 'Bank of Industry and Mine',
    prefixes: ['627961'],
    gradientFrom: '#334155',
    gradientVia: '#1e293b',
    gradientTo: '#0f172a',
    accentColor: '#94a3b8',
  },
  tosee_taavon: {
    id: 'tosee_taavon',
    name: 'بانک توسعه تعاون',
    englishName: 'Tosee Taavon Bank',
    prefixes: ['502908'],
    gradientFrom: '#0284c7',
    gradientVia: '#0369a1',
    gradientTo: '#1e293b',
    accentColor: '#38bdf8',
  },
  other: {
    id: 'other',
    name: 'سایر بانک‌ها (شاپرک)',
    englishName: 'Shetab Card',
    prefixes: [],
    gradientFrom: '#334155',
    gradientVia: '#1e293b',
    gradientTo: '#0f172a',
    accentColor: '#94a3b8',
  },
};

type LogoComp = React.ComponentType<{
  width?: number | string;
  height?: number | string;
  className?: string;
}>;

const BANK_LOGO_COLOR: Record<IranianBankId, LogoComp> = {
  mellat: BankMellatColor,
  melli: BankMelliColor,
  saman: BankSamanColor,
  pasargad: BankPasargadColor,
  parsian: BankParsianColor,
  tejarat: BankTejaratColor,
  saderat: BankSaderatColor,
  maskan: BankMaskanColor,
  keshavarzi: BankKeshavarziColor,
  sepah: BankSepahColor,
  blu: BankBlubankColor,
  resalat: BankResalatColor,
  ayandeh: BankAyandehColor,
  shahr: BankShahrColor,
  gardeshgari: BankGardeshgariColor,
  eghtesad_novin: BankEghtesadNovinColor,
  refah: BankRefahColor,
  mehr_iran: BankMehrIranColor,
  sina: BankSinaColor,
  karafarin: BankKarafarinColor,
  dey: BankDeyColor,
  sarmayeh: BankSarmayehColor,
  postbank: BankPostbankColor,
  bankino: BankBankinoColor,
  izbank: BankIranZaminColor,
  khavarmianeh: BankKhavarMianehColor,
  sanat_madan: BankSanatMadanColor,
  tosee_taavon: BankToseeTaavonColor,
  other: GatewayShaparakColor,
};

const BANK_LOGO_MONO: Record<IranianBankId, LogoComp> = {
  mellat: BankMellatMono,
  melli: BankMelliMono,
  saman: BankSamanMono,
  pasargad: BankPasargadMono,
  parsian: BankParsianMono,
  tejarat: BankTejaratMono,
  saderat: BankSaderatMono,
  maskan: BankMaskanMono,
  keshavarzi: BankKeshavarziMono,
  sepah: BankSepahMono,
  blu: BankBlubankMono,
  resalat: BankResalatMono,
  ayandeh: BankAyandehMono,
  shahr: BankShahrMono,
  gardeshgari: BankGardeshgariMono,
  eghtesad_novin: BankEghtesadNovinMono,
  refah: BankRefahMono,
  mehr_iran: BankMehrIranMono,
  sina: BankSinaMono,
  karafarin: BankKarafarinMono,
  dey: BankDeyMono,
  sarmayeh: BankSarmayehMono,
  postbank: BankPostbankMono,
  bankino: BankBankinoMono,
  izbank: BankIranZaminMono,
  khavarmianeh: BankKhavarMianehMono,
  sanat_madan: BankSanatMadanMono,
  tosee_taavon: BankToseeTaavonMono,
  other: GatewayShaparakMono,
};

export function detectBankByCardNumber(cardNumber: string): IranianBankId | null {
  const clean = cardNumber.replace(/\D/g, '');
  if (clean.length < 6) return null;
  if (clean.startsWith('62198619')) return 'blu';
  if (clean.startsWith('58594700')) return 'bankino';
  const prefix6 = clean.slice(0, 6);
  for (const bank of Object.values(IRANIAN_BANKS)) {
    if (bank.prefixes.includes(prefix6)) {
      return bank.id;
    }
  }
  return null;
}

export const BankLogoVector: React.FC<{
  bankId: IranianBankId;
  size?: number;
  mono?: boolean;
  className?: string;
}> = ({ bankId, size = 32, mono = false, className = '' }) => {
  const isDocMonochrome =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-color-theme') === 'monochrome';
  const useMono = mono || isDocMonochrome;

  const LogoComponent = useMono
    ? BANK_LOGO_MONO[bankId] || GatewayShaparakMono
    : BANK_LOGO_COLOR[bankId] || GatewayShaparakColor;

  const innerSize = Math.round(size * 0.58);

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full flex items-center justify-center shrink-0 relative overflow-hidden bg-white dark:bg-slate-100 border border-white/40 shadow-xs text-slate-900 ${className}`}
    >
      <LogoComponent
        width={innerSize}
        height={innerSize}
        className="relative z-10 object-contain text-zinc-900"
      />
    </div>
  );
};
