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
    gradientFrom: '#e15b76',
    gradientVia: '#c84b68',
    gradientTo: '#9f3a56',
    accentColor: '#fecdd3',
  },
  saman: {
    id: 'saman',
    name: 'بانک سامان',
    englishName: 'Saman Bank',
    prefixes: ['621986'],
    gradientFrom: '#4aa3df',
    gradientVia: '#3887c7',
    gradientTo: '#2c68a6',
    accentColor: '#bae6fd',
  },
  blu: {
    id: 'blu',
    name: 'بلوبانک (سامان)',
    englishName: 'Blu Bank',
    prefixes: ['62198619'],
    gradientFrom: '#5b8def',
    gradientVia: '#4776db',
    gradientTo: '#395cb8',
    accentColor: '#bfdbfe',
  },
  pasargad: {
    id: 'pasargad',
    name: 'بانک پاسارگاد',
    englishName: 'Bank Pasargad',
    prefixes: ['502229', '639347'],
    gradientFrom: '#d4944e',
    gradientVia: '#b0783c',
    gradientTo: '#6b5344',
    accentColor: '#fde68a',
  },
  melli: {
    id: 'melli',
    name: 'بانک ملی ایران',
    englishName: 'Bank Melli Iran',
    prefixes: ['603799'],
    gradientFrom: '#38a89d',
    gradientVia: '#2b8a82',
    gradientTo: '#216e69',
    accentColor: '#99f6e4',
  },
  parsian: {
    id: 'parsian',
    name: 'بانک پارسیان',
    englishName: 'Parsian Bank',
    prefixes: ['622106', '639194', '627884'],
    gradientFrom: '#d97757',
    gradientVia: '#b85d43',
    gradientTo: '#8a4432',
    accentColor: '#fed7aa',
  },
  tejarat: {
    id: 'tejarat',
    name: 'بانک تجارت',
    englishName: 'Bank Tejarat',
    prefixes: ['627353', '585983'],
    gradientFrom: '#5279d6',
    gradientVia: '#3e62ba',
    gradientTo: '#2e4b94',
    accentColor: '#bfdbfe',
  },
  saderat: {
    id: 'saderat',
    name: 'بانک صادرات',
    englishName: 'Bank Saderat',
    prefixes: ['603769'],
    gradientFrom: '#4e7ae6',
    gradientVia: '#3b63c7',
    gradientTo: '#2d4b9a',
    accentColor: '#bfdbfe',
  },
  maskan: {
    id: 'maskan',
    name: 'بانک مسکن',
    englishName: 'Bank Maskan',
    prefixes: ['628023'],
    gradientFrom: '#ec824c',
    gradientVia: '#d46937',
    gradientTo: '#a84f29',
    accentColor: '#fed7aa',
  },
  keshavarzi: {
    id: 'keshavarzi',
    name: 'بانک کشاورزی',
    englishName: 'Bank Keshavarzi',
    prefixes: ['603770', '639217'],
    gradientFrom: '#48b074',
    gradientVia: '#36945e',
    gradientTo: '#287549',
    accentColor: '#bbf7d0',
  },
  sepah: {
    id: 'sepah',
    name: 'بانک سپه',
    englishName: 'Bank Sepah',
    prefixes: ['589210'],
    gradientFrom: '#dc6068',
    gradientVia: '#bc4952',
    gradientTo: '#913840',
    accentColor: '#fecaca',
  },
  resalat: {
    id: 'resalat',
    name: 'بانک قرض‌الحسنه رسالت',
    englishName: 'Resalat Bank',
    prefixes: ['504172'],
    gradientFrom: '#38aec8',
    gradientVia: '#2990a8',
    gradientTo: '#207085',
    accentColor: '#a5f3fc',
  },
  mehr_iran: {
    id: 'mehr_iran',
    name: 'بانک قرض‌الحسنه مهر ایران',
    englishName: 'Mehr Iran Bank',
    prefixes: ['606373'],
    gradientFrom: '#4ab87b',
    gradientVia: '#379963',
    gradientTo: '#27784c',
    accentColor: '#bbf7d0',
  },
  ayandeh: {
    id: 'ayandeh',
    name: 'بانک آینده',
    englishName: 'Ayandeh Bank',
    prefixes: ['636214'],
    gradientFrom: '#b8824c',
    gradientVia: '#8f643b',
    gradientTo: '#5c4738',
    accentColor: '#fde68a',
  },
  shahr: {
    id: 'shahr',
    name: 'بانک شهر',
    englishName: 'Shahr Bank',
    prefixes: ['502806', '504706'],
    gradientFrom: '#e0636b',
    gradientVia: '#b84c56',
    gradientTo: '#6b535c',
    accentColor: '#fecdd3',
  },
  gardeshgari: {
    id: 'gardeshgari',
    name: 'بانک گردشگری',
    englishName: 'Tourism Bank',
    prefixes: ['505416'],
    gradientFrom: '#d15679',
    gradientVia: '#a63e5e',
    gradientTo: '#633548',
    accentColor: '#fbcfe8',
  },
  eghtesad_novin: {
    id: 'eghtesad_novin',
    name: 'بانک اقتصاد نوین',
    englishName: 'EN Bank',
    prefixes: ['627412'],
    gradientFrom: '#9b6ad6',
    gradientVia: '#7e50b8',
    gradientTo: '#5f3b91',
    accentColor: '#e9d5ff',
  },
  refah: {
    id: 'refah',
    name: 'بانک رفاه کارگران',
    englishName: 'Refah Bank',
    prefixes: ['589463'],
    gradientFrom: '#686de0',
    gradientVia: '#5256bd',
    gradientTo: '#3d4094',
    accentColor: '#c7d2fe',
  },
  sina: {
    id: 'sina',
    name: 'بانک سینا',
    englishName: 'Sina Bank',
    prefixes: ['639346'],
    gradientFrom: '#5478c9',
    gradientVia: '#3f5ea8',
    gradientTo: '#2f4682',
    accentColor: '#bfdbfe',
  },
  karafarin: {
    id: 'karafarin',
    name: 'بانک کارآفرین',
    englishName: 'Karafarin Bank',
    prefixes: ['627488', '502910'],
    gradientFrom: '#3ca888',
    gradientVia: '#2c8a6e',
    gradientTo: '#206b54',
    accentColor: '#a7f3d0',
  },
  dey: {
    id: 'dey',
    name: 'بانک دی',
    englishName: 'Bank Dey',
    prefixes: ['502938'],
    gradientFrom: '#45a8a1',
    gradientVia: '#348782',
    gradientTo: '#38575c',
    accentColor: '#99f6e4',
  },
  sarmayeh: {
    id: 'sarmayeh',
    name: 'بانک سرمایه',
    englishName: 'Sarmayeh Bank',
    prefixes: ['639607'],
    gradientFrom: '#736ced',
    gradientVia: '#5b54c9',
    gradientTo: '#443ea1',
    accentColor: '#c7d2fe',
  },
  postbank: {
    id: 'postbank',
    name: 'پست بانک ایران',
    englishName: 'Post Bank Iran',
    prefixes: ['627760'],
    gradientFrom: '#489ad4',
    gradientVia: '#367eb3',
    gradientTo: '#28628f',
    accentColor: '#bae6fd',
  },
  bankino: {
    id: 'bankino',
    name: 'بانکینو (خاورمیانه)',
    englishName: 'Bankino',
    prefixes: ['58594700'],
    gradientFrom: '#e65c85',
    gradientVia: '#c4456c',
    gradientTo: '#8f3454',
    accentColor: '#fbcfe8',
  },
  izbank: {
    id: 'izbank',
    name: 'بانک ایران زمین',
    englishName: 'Iran Zamin Bank',
    prefixes: ['505785'],
    gradientFrom: '#a665e0',
    gradientVia: '#864bbd',
    gradientTo: '#643794',
    accentColor: '#e9d5ff',
  },
  khavarmianeh: {
    id: 'khavarmianeh',
    name: 'بانک خاورمیانه',
    englishName: 'Middle East Bank',
    prefixes: ['585947'],
    gradientFrom: '#d9934c',
    gradientVia: '#b57637',
    gradientTo: '#875627',
    accentColor: '#fde68a',
  },
  sanat_madan: {
    id: 'sanat_madan',
    name: 'بانک صنعت و معدن',
    englishName: 'Bank of Industry and Mine',
    prefixes: ['627961'],
    gradientFrom: '#64748b',
    gradientVia: '#475569',
    gradientTo: '#334155',
    accentColor: '#cbd5e1',
  },
  tosee_taavon: {
    id: 'tosee_taavon',
    name: 'بانک توسعه تعاون',
    englishName: 'Tosee Taavon Bank',
    prefixes: ['502908'],
    gradientFrom: '#4aa3df',
    gradientVia: '#3682b8',
    gradientTo: '#334e68',
    accentColor: '#bae6fd',
  },
  other: {
    id: 'other',
    name: 'سایر بانک‌ها (شاپرک)',
    englishName: 'Shetab Card',
    prefixes: [],
    gradientFrom: '#64748b',
    gradientVia: '#475569',
    gradientTo: '#334155',
    accentColor: '#cbd5e1',
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
      className={`rounded-full flex items-center justify-center shrink-0 relative overflow-hidden bg-white/95 dark:bg-slate-100 border border-white/50 shadow-xs text-slate-900 ${className}`}
    >
      <LogoComponent
        width={innerSize}
        height={innerSize}
        className="relative z-10 object-contain text-zinc-900"
      />
    </div>
  );
};
