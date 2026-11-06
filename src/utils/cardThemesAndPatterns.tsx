import React from 'react';
import { BankCard, CardColorThemeId, CardPatternId } from '../types';
import { IRANIAN_BANKS } from './iranianBanks';

export interface CardColorPalette {
  id: CardColorThemeId;
  name: string;
  from: string;
  via: string;
  to: string;
  accent: string;
}

export const CARD_COLOR_PALETTES: CardColorPalette[] = [
  {
    id: 'auto',
    name: 'خودکار (رنگ بانک)',
    from: '#4aa3df',
    via: '#38a89d',
    to: '#5b8def',
    accent: '#bae6fd',
  },
  // 12 Soft Pastel Glass Palettes (پاستیلی و شیشه‌ای)
  {
    id: 'pastel_rose',
    name: 'رز پاستیلی',
    from: '#e87996',
    via: '#d66586',
    to: '#b55476',
    accent: '#ffe4e6',
  },
  {
    id: 'pastel_lavender',
    name: 'اسطوخودوس پاستیلی',
    from: '#9d84e8',
    via: '#876fd6',
    to: '#6d59ba',
    accent: '#f3e8ff',
  },
  {
    id: 'pastel_mint',
    name: 'نعنایی پاستیلی',
    from: '#4ec4a0',
    via: '#3dae8b',
    to: '#2e9173',
    accent: '#d1fae5',
  },
  {
    id: 'pastel_sky',
    name: 'آبی آسمانی پاستیلی',
    from: '#5ca9e6',
    via: '#4892cf',
    to: '#3876b0',
    accent: '#e0f2fe',
  },
  {
    id: 'pastel_peach',
    name: 'هلویی نرم',
    from: '#ee8b6c',
    via: '#d97557',
    to: '#b85d43',
    accent: '#ffedd5',
  },
  {
    id: 'pastel_lilac',
    name: 'یاسی ابریشمی',
    from: '#c07ce6',
    via: '#a864cf',
    to: '#8a4eb0',
    accent: '#fae8ff',
  },
  {
    id: 'pastel_pistachio',
    name: 'پسته‌ای پاستیلی',
    from: '#6ab87a',
    via: '#549e64',
    to: '#3f824e',
    accent: '#dcfce7',
  },
  {
    id: 'pastel_aqua',
    name: 'فیروزه‌ای پاستیلی',
    from: '#47b8c9',
    via: '#369eb0',
    to: '#288091',
    accent: '#cffafe',
  },
  {
    id: 'pastel_champagne',
    name: 'شامپاینی پاستیلی',
    from: '#d99e5b',
    via: '#c28746',
    to: '#9e6b34',
    accent: '#fef3c7',
  },
  {
    id: 'pastel_coral',
    name: 'مرجانی پاستیلی',
    from: '#eb7575',
    via: '#d45f63',
    to: '#b34b52',
    accent: '#ffe4e6',
  },
  {
    id: 'pastel_periwinkle',
    name: 'نیلوفری پاستیلی',
    from: '#7484e8',
    via: '#5e6ed4',
    to: '#4958b5',
    accent: '#e0e7ff',
  },
  {
    id: 'pastel_pearl',
    name: 'مرواریدی یخی',
    from: '#7a8a9e',
    via: '#637387',
    to: '#4c5b6e',
    accent: '#f1f5f9',
  },
  // 12 Frosted Jewel Palettes (شیشه‌ای مات و عمیق)
  {
    id: 'emerald_night',
    name: 'زمرد شیشه‌ای',
    from: '#2d9c78',
    via: '#1f7d5f',
    to: '#165e47',
    accent: '#a7f3d0',
  },
  {
    id: 'royal_cobalt',
    name: 'لاجوردی شیشه‌ای',
    from: '#3b82f6',
    via: '#2b66c9',
    to: '#1e4b9e',
    accent: '#bae6fd',
  },
  {
    id: 'crimson_ruby',
    name: 'یاقوت شیشه‌ای',
    from: '#e05270',
    via: '#bd3b58',
    to: '#912942',
    accent: '#fecdd3',
  },
  {
    id: 'obsidian_gold',
    name: 'کربن و طلایی مات',
    from: '#4b5563',
    via: '#374151',
    to: '#92622a',
    accent: '#fde68a',
  },
  {
    id: 'violet_nebula',
    name: 'کهکشان بنفش',
    from: '#8b5cf6',
    via: '#6f42d4',
    to: '#542eab',
    accent: '#e9d5ff',
  },
  {
    id: 'persian_turquoise',
    name: 'فیروزه نیشابور',
    from: '#22a6b8',
    via: '#198596',
    to: '#146675',
    accent: '#a5f3fc',
  },
  {
    id: 'sunset_amber',
    name: 'غروب کهربایی',
    from: '#d9823b',
    via: '#b86628',
    to: '#8c4b1b',
    accent: '#fde68a',
  },
  {
    id: 'midnight_slate',
    name: 'تیتانیوم شیشه‌ای',
    from: '#52627a',
    via: '#3d4b61',
    to: '#293548',
    accent: '#e2e8f0',
  },
  {
    id: 'rose_velvet',
    name: 'رزگلد مخملی',
    from: '#d65c8c',
    via: '#b54572',
    to: '#8c3257',
    accent: '#fbcfe8',
  },
  {
    id: 'forest_olive',
    name: 'سبز زیتونی مات',
    from: '#5c9e57',
    via: '#478243',
    to: '#346331',
    accent: '#d9f99d',
  },
  {
    id: 'cyber_indigo',
    name: 'نیلی شیشه‌ای',
    from: '#6366f1',
    via: '#4d4fd1',
    to: '#393ba8',
    accent: '#c7d2fe',
  },
  {
    id: 'copper_bronze',
    name: 'مس و برنز پاستیلی',
    from: '#c97355',
    via: '#a8593e',
    to: '#7d3f2b',
    accent: '#fed7aa',
  },
];

export interface CardPatternMeta {
  id: CardPatternId;
  name: string;
  description: string;
}

export const CARD_VECTOR_PATTERNS: CardPatternMeta[] = [
  {
    id: 'silk_waves',
    name: 'موج‌های ابریشمی',
    description: 'خطوط منحنی سیال و نرم',
  },
  {
    id: 'persian_girih',
    name: 'گره‌چینی ایرانی',
    description: 'هندسه ستاره هشت‌پر اصیل',
  },
  {
    id: 'isometric_prism',
    name: 'تراش الماس',
    description: 'وجوه کریستالی چندضلعی',
  },
  {
    id: 'orbital_aurora',
    name: 'مدار کیهانی',
    description: 'حلقه‌های سیاره‌ای و مدار',
  },
  {
    id: 'topographic',
    name: 'خطوط تراز',
    description: 'منحنی‌های توپوگرافی مدرن',
  },
  {
    id: 'circuit_nodes',
    name: 'مدار فین‌تک',
    description: 'شبکه دیجیتال و نقاط نوری',
  },
  {
    id: 'bauhaus_arcs',
    name: 'کمان‌های باهاوس',
    description: 'آرک‌های هندسی مینیمال',
  },
  {
    id: 'guilloche',
    name: 'گیلوشه بانکی',
    description: 'موج‌های امنیتی ظریف',
  },
  {
    id: 'starfield_mesh',
    name: 'شبکه ستاره‌ای',
    description: 'صورت فلکی و یال‌های نوری',
  },
  {
    id: 'lotus_mandala',
    name: 'ماندالای نیلوفر',
    description: 'گلبرگ‌های هندسی متقارن',
  },
  {
    id: 'hex_honeycomb',
    name: 'کندوی شش‌ضلعی',
    description: 'شبکه هگزاگونال مدرن',
  },
  {
    id: 'aurora_ribbons',
    name: 'روبان‌های شفق',
    description: 'امواج موازی چندلایه',
  },
  {
    id: 'fibonacci_shells',
    name: 'مارپیچ طلایی',
    description: 'دوایر متداخل فیبوناچی',
  },
  {
    id: 'origami_facets',
    name: 'وجوه اوریگامی',
    description: 'مثلث‌های کاغذی سه‌بعدی',
  },
  {
    id: 'islamic_arabesque',
    name: 'اسلیمی مدرن',
    description: 'قوس‌های متقاطع ایرانی',
  },
  {
    id: 'sound_spectrum',
    name: 'طیف فرکانس',
    description: 'پالس‌های عمودی ریتمیک',
  },
  {
    id: 'celestial_compass',
    name: 'قطب‌نمای ستاره‌ای',
    description: 'پرتوهای خورشیدی و مدار',
  },
  {
    id: 'japanese_seigaiha',
    name: 'موج‌های سیگایها',
    description: 'کمان‌های هم‌مرکز کلاسیک',
  },
  {
    id: 'crystal_lattice',
    name: 'شبکه بلوری',
    description: 'خطوط الماسی متقاطع',
  },
  {
    id: 'minimal_glow',
    name: 'شیشه‌ای ساده',
    description: 'فقط درخشش شیشه‌ای ملایم',
  },
];

/**
 * Smartly resolves the gradient colors for a card:
 * - If card.cardColorTheme is set and !== 'auto', uses that palette
 * - Otherwise auto-detects from bankId and card title (e.g. وی‌پاد, کیوبانک, بانکینو, بلوبانک)
 */
export function resolveCardGradient(
  card: Pick<BankCard, 'bankId' | 'title' | 'cardColorTheme'>
): { from: string; via: string; to: string; accent: string } {
  const themeId = card.cardColorTheme || 'auto';
  if (themeId !== 'auto') {
    const found = CARD_COLOR_PALETTES.find((p) => p.id === themeId);
    if (found) {
      return {
        from: found.from,
        via: found.via,
        to: found.to,
        accent: found.accent,
      };
    }
  }

  // Smart title-based detection for neo-banks (وی‌پاد، کیوبانک، بانکینو، بلوبانک)
  const t = (card.title || '').toLowerCase();
  if (t.includes('وی‌پاد') || t.includes('وی پاد') || t.includes('wepod')) {
    return {
      from: '#3b9c94',
      via: '#2c7d78',
      to: '#334e68',
      accent: '#99f6e4',
    };
  }
  if (t.includes('کیوبانک') || t.includes('کیو بانک') || t.includes('qbank')) {
    return {
      from: '#48b08c',
      via: '#369474',
      to: '#28755b',
      accent: '#a7f3d0',
    };
  }
  if (t.includes('بانکینو') || t.includes('bankino')) {
    return {
      from: '#9d74e0',
      via: '#8159c4',
      to: '#6441a3',
      accent: '#e9d5ff',
    };
  }

  const bank = IRANIAN_BANKS[card.bankId] || IRANIAN_BANKS.other;
  return {
    from: bank.gradientFrom,
    via: bank.gradientVia,
    to: bank.gradientTo,
    accent: bank.accentColor,
  };
}

/**
 * Resolves the vector pattern for a card. If not explicitly saved on the card yet,
 * deterministically picks a rich pattern based on card.id / card.cardNumber
 */
export function resolveCardPattern(
  card: Pick<BankCard, 'id' | 'cardNumber' | 'patternId'>
): CardPatternId {
  if (card.patternId) return card.patternId;
  const seedStr = `${card.id || ''}_${card.cardNumber || ''}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  const richPatterns: CardPatternId[] = CARD_VECTOR_PATTERNS.filter(
    (p) => p.id !== 'minimal_glow'
  ).map((p) => p.id);
  return richPatterns[hash % richPatterns.length] || 'silk_waves';
}

/**
 * Picks a random color theme and random vector pattern for 1-click randomization
 */
export function pickRandomCardStyle(
  currentColor?: CardColorThemeId,
  currentPattern?: CardPatternId
): { cardColorTheme: CardColorThemeId; patternId: CardPatternId } {
  const customPalettes = CARD_COLOR_PALETTES.filter(
    (p) => p.id !== 'auto' && p.id !== currentColor
  );
  const patterns = CARD_VECTOR_PATTERNS.filter(
    (p) => p.id !== 'minimal_glow' && p.id !== currentPattern
  );

  const randomColor =
    customPalettes[Math.floor(Math.random() * customPalettes.length)]?.id ||
    'pastel_sky';
  const randomPattern =
    patterns[Math.floor(Math.random() * patterns.length)]?.id || 'silk_waves';

  return {
    cardColorTheme: randomColor,
    patternId: randomPattern,
  };
}

/**
 * Renders the crisp SVG Vector Pattern + Frosted Glass Specular Sheen inside a bank card
 */
export const CardVectorPatternOverlay: React.FC<{
  patternId: CardPatternId;
  accentColor: string;
}> = ({ patternId, accentColor }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* Frosted Glass Diagonal Specular Reflection */}
      <div
        className="absolute inset-0 opacity-75"
        style={{
          background:
            'linear-gradient(125deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.10) 36%, rgba(255,255,255,0.0) 56%, rgba(255,255,255,0.16) 100%)',
        }}
      />

      {/* Soft Pastel Ambient Orbs */}
      <div
        className="absolute -left-10 -top-10 w-48 h-48 rounded-full opacity-35 blur-2xl"
        style={{
          background: `radial-gradient(circle, ${accentColor}, transparent 70%)`,
        }}
      />
      <div
        className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full opacity-25 blur-2xl"
        style={{
          background: `radial-gradient(circle, #ffffff, transparent 70%)`,
        }}
      />

      {patternId === 'silk_waves' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.26]"
          viewBox="0 0 400 220"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M-40 160 C 80 60, 200 240, 440 80"
            stroke={accentColor}
            strokeWidth="2.5"
          />
          <path
            d="M-40 180 C 90 80, 210 250, 440 100"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />
          <path
            d="M-40 200 C 100 100, 220 260, 440 120"
            stroke={accentColor}
            strokeWidth="1.2"
          />
          <path
            d="M-20 40 C 120 140, 260 -20, 420 90"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeOpacity="0.55"
          />
          <circle cx="330" cy="55" r="42" stroke={accentColor} strokeWidth="1.2" strokeOpacity="0.6" />
          <circle cx="330" cy="55" r="24" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.4" />
        </svg>
      )}

      {patternId === 'persian_girih' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.22]"
          viewBox="0 0 400 220"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            <pattern
              id="girih-tile"
              x="0"
              y="0"
              width="72"
              height="72"
              patternUnits="userSpaceOnUse"
            >
              <polygon
                points="36,4 45,27 68,36 45,45 36,68 27,45 4,36 27,27"
                stroke="#ffffff"
                strokeWidth="1.4"
              />
              <rect
                x="18"
                y="18"
                width="36"
                height="36"
                transform="rotate(45 36 36)"
                stroke={accentColor}
                strokeWidth="1.1"
              />
              <circle cx="36" cy="36" r="5" stroke="#ffffff" strokeWidth="1.2" />
            </pattern>
          </defs>
          <rect width="400" height="220" fill="url(#girih-tile)" />
        </svg>
      )}

      {patternId === 'isometric_prism' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.24]"
          viewBox="0 0 400 220"
          preserveAspectRatio="none"
          fill="none"
        >
          <polygon
            points="260,-10 390,40 320,140"
            fill="#ffffff"
            fillOpacity="0.16"
            stroke="#ffffff"
            strokeWidth="1.2"
          />
          <polygon
            points="320,140 390,40 430,190"
            fill={accentColor}
            fillOpacity="0.22"
            stroke={accentColor}
            strokeWidth="1.2"
          />
          <polygon
            points="180,60 260,-10 320,140"
            fill="#ffffff"
            fillOpacity="0.1"
            stroke="#ffffff"
            strokeWidth="1"
          />
          <polygon
            points="-20,120 90,60 50,210"
            fill={accentColor}
            fillOpacity="0.18"
            stroke="#ffffff"
            strokeWidth="1"
          />
          <polygon
            points="90,60 180,60 135,175"
            stroke={accentColor}
            strokeWidth="1.2"
            strokeOpacity="0.75"
          />
        </svg>
      )}

      {patternId === 'orbital_aurora' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.26]"
          viewBox="0 0 400 220"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <circle cx="330" cy="110" r="130" stroke="#ffffff" strokeWidth="1.2" />
          <circle
            cx="330"
            cy="110"
            r="98"
            stroke={accentColor}
            strokeWidth="1.8"
            strokeDasharray="8 6"
          />
          <circle cx="330" cy="110" r="66" stroke="#ffffff" strokeWidth="1.2" />
          <circle cx="330" cy="110" r="32" fill={accentColor} fillOpacity="0.24" />
          <circle cx="232" cy="110" r="5" fill="#ffffff" />
          <circle cx="280" cy="54" r="4" fill={accentColor} />
          <ellipse
            cx="95"
            cy="185"
            rx="90"
            ry="38"
            transform="rotate(-18 95 185)"
            stroke="#ffffff"
            strokeWidth="1"
            strokeOpacity="0.65"
          />
        </svg>
      )}

      {patternId === 'topographic' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.24]"
          viewBox="0 0 400 220"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M220 -20 C 260 60, 350 40, 420 110 C 350 180, 270 150, 200 240"
            stroke="#ffffff"
            strokeWidth="1.4"
          />
          <path
            d="M250 -20 C 285 50, 365 35, 430 95 C 365 160, 295 135, 235 240"
            stroke={accentColor}
            strokeWidth="1.4"
          />
          <path
            d="M280 -20 C 310 40, 380 30, 440 80 C 380 140, 320 120, 270 240"
            stroke="#ffffff"
            strokeWidth="1.1"
          />
          <path
            d="M-30 30 C 40 50, 90 110, 40 180 C 10 210, -20 220, -30 230"
            stroke={accentColor}
            strokeWidth="1.5"
          />
          <path
            d="M-30 5 C 65 30, 125 105, 65 195"
            stroke="#ffffff"
            strokeWidth="1.1"
            strokeDasharray="6 4"
          />
        </svg>
      )}

      {patternId === 'circuit_nodes' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.26]"
          viewBox="0 0 400 220"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M240 25 H 300 L 330 55 H 385"
            stroke={accentColor}
            strokeWidth="1.8"
          />
          <circle cx="240" cy="25" r="4" fill={accentColor} />
          <circle cx="385" cy="55" r="4" fill="#ffffff" />

          <path
            d="M210 75 H 275 L 305 105 H 360 L 385 130"
            stroke="#ffffff"
            strokeWidth="1.4"
          />
          <circle cx="210" cy="75" r="4" fill="#ffffff" />
          <circle cx="305" cy="105" r="3.5" fill={accentColor} />

          <path
            d="M260 165 H 320 L 345 140 H 410"
            stroke={accentColor}
            strokeWidth="1.6"
          />
          <circle cx="260" cy="165" r="4" fill="#ffffff" />

          <path
            d="M15 150 H 70 L 95 180 H 155"
            stroke="#ffffff"
            strokeWidth="1.3"
          />
          <circle cx="15" cy="150" r="3.5" fill={accentColor} />
          <circle cx="155" cy="180" r="4" fill="#ffffff" />
        </svg>
      )}

      {patternId === 'bauhaus_arcs' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.24]"
          viewBox="0 0 400 220"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <path d="M400 0 A 140 140 0 0 1 260 140 L 400 140 Z" fill="#ffffff" fillOpacity="0.18" />
          <path d="M260 0 A 90 90 0 0 0 350 90 L 350 0 Z" fill={accentColor} fillOpacity="0.26" />
          <circle cx="310" cy="165" r="36" stroke="#ffffff" strokeWidth="8" strokeOpacity="0.24" />
          <line x1="20" y1="0" x2="120" y2="220" stroke={accentColor} strokeWidth="3" strokeOpacity="0.35" />
          <line x1="45" y1="0" x2="145" y2="220" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.32" />
        </svg>
      )}

      {patternId === 'guilloche' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.25]"
          viewBox="0 0 400 220"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M-20 110 Q 80 -30, 200 110 T 420 110"
            stroke="#ffffff"
            strokeWidth="1.3"
          />
          <path
            d="M-20 110 Q 80 250, 200 110 T 420 110"
            stroke={accentColor}
            strokeWidth="1.3"
          />
          <path
            d="M-20 90 Q 80 -10, 200 110 T 420 130"
            stroke="#ffffff"
            strokeWidth="1"
            strokeOpacity="0.7"
          />
          <path
            d="M-20 130 Q 80 230, 200 110 T 420 90"
            stroke={accentColor}
            strokeWidth="1"
            strokeOpacity="0.7"
          />
          <path
            d="M-20 70 Q 100 10, 200 110 T 420 150"
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeOpacity="0.55"
          />
        </svg>
      )}

      {patternId === 'starfield_mesh' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.26]"
          viewBox="0 0 400 220"
          preserveAspectRatio="none"
          fill="none"
        >
          <polyline
            points="230,35 295,25 345,75 285,120 230,35"
            stroke="#ffffff"
            strokeWidth="1.2"
          />
          <polyline
            points="295,25 375,40 345,75 380,155 285,120"
            stroke={accentColor}
            strokeWidth="1.2"
          />
          <polyline
            points="45,140 110,95 150,165 45,140"
            stroke="#ffffff"
            strokeWidth="1"
          />
          {[
            [230, 35],
            [295, 25],
            [345, 75],
            [285, 120],
            [375, 40],
            [380, 155],
            [45, 140],
            [110, 95],
            [150, 165],
          ].map(([cx, cy], idx) => (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={idx % 2 === 0 ? 4 : 3}
              fill={idx % 2 === 0 ? '#ffffff' : accentColor}
            />
          ))}
        </svg>
      )}

      {patternId === 'lotus_mandala' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.24]"
          viewBox="0 0 400 220"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          {[0, 30, 60, 90, 120, 150].map((deg) => (
            <ellipse
              key={deg}
              cx="320"
              cy="110"
              rx="78"
              ry="26"
              transform={`rotate(${deg} 320 110)`}
              stroke="#ffffff"
              strokeWidth="1.2"
            />
          ))}
          {[15, 45, 75, 105, 135, 165].map((deg) => (
            <ellipse
              key={deg}
              cx="320"
              cy="110"
              rx="52"
              ry="18"
              transform={`rotate(${deg} 320 110)`}
              stroke={accentColor}
              strokeWidth="1.2"
            />
          ))}
          <circle cx="320" cy="110" r="14" fill="#ffffff" fillOpacity="0.25" />
        </svg>
      )}

      {patternId === 'hex_honeycomb' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.22]"
          viewBox="0 0 400 220"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            <pattern
              id="hex-grid"
              width="48"
              height="42"
              patternUnits="userSpaceOnUse"
            >
              <polygon
                points="24,2 44,13 44,31 24,42 4,31 4,13"
                stroke="#ffffff"
                strokeWidth="1.2"
              />
              <circle cx="24" cy="22" r="3" fill={accentColor} fillOpacity="0.6" />
            </pattern>
          </defs>
          <rect width="400" height="220" fill="url(#hex-grid)" />
        </svg>
      )}

      {patternId === 'aurora_ribbons' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.28]"
          viewBox="0 0 400 220"
          preserveAspectRatio="none"
          fill="none"
        >
          {[0, 12, 24, 36, 48, 60].map((offset, idx) => (
            <path
              key={offset}
              d={`M-30 ${40 + offset} C 110 ${-20 + offset}, 250 ${190 - offset}, 430 ${30 + offset}`}
              stroke={idx % 2 === 0 ? '#ffffff' : accentColor}
              strokeWidth={idx % 2 === 0 ? '1.5' : '1.2'}
              strokeOpacity={0.85 - idx * 0.1}
            />
          ))}
        </svg>
      )}

      {patternId === 'fibonacci_shells' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.24]"
          viewBox="0 0 400 220"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <circle cx="340" cy="140" r="21" stroke="#ffffff" strokeWidth="1.3" />
          <circle cx="325" cy="125" r="34" stroke={accentColor} strokeWidth="1.3" />
          <circle cx="300" cy="110" r="55" stroke="#ffffff" strokeWidth="1.3" />
          <circle cx="265" cy="95" r="89" stroke={accentColor} strokeWidth="1.3" />
          <circle cx="210" cy="80" r="144" stroke="#ffffff" strokeWidth="1.1" strokeDasharray="6 4" />
        </svg>
      )}

      {patternId === 'origami_facets' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.24]"
          viewBox="0 0 400 220"
          preserveAspectRatio="none"
          fill="none"
        >
          <polygon points="200,0 310,0 255,95" fill="#ffffff" fillOpacity="0.18" stroke="#ffffff" strokeWidth="1" />
          <polygon points="310,0 400,0 400,110 255,95" fill={accentColor} fillOpacity="0.16" stroke={accentColor} strokeWidth="1" />
          <polygon points="255,95 400,110 330,220" fill="#ffffff" fillOpacity="0.12" stroke="#ffffff" strokeWidth="1" />
          <polygon points="150,220 255,95 330,220" fill={accentColor} fillOpacity="0.2" stroke="#ffffff" strokeWidth="1" />
          <polygon points="0,140 95,80 150,220 0,220" fill="#ffffff" fillOpacity="0.1" stroke={accentColor} strokeWidth="1" />
        </svg>
      )}

      {patternId === 'islamic_arabesque' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.23]"
          viewBox="0 0 400 220"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            <pattern
              id="arabesque-pattern"
              width="64"
              height="64"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="32" cy="32" r="28" stroke="#ffffff" strokeWidth="1.1" />
              <circle cx="0" cy="0" r="28" stroke={accentColor} strokeWidth="1.1" />
              <circle cx="64" cy="0" r="28" stroke={accentColor} strokeWidth="1.1" />
              <circle cx="0" cy="64" r="28" stroke={accentColor} strokeWidth="1.1" />
              <circle cx="64" cy="64" r="28" stroke={accentColor} strokeWidth="1.1" />
            </pattern>
          </defs>
          <rect width="400" height="220" fill="url(#arabesque-pattern)" />
        </svg>
      )}

      {patternId === 'sound_spectrum' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.25]"
          viewBox="0 0 400 220"
          preserveAspectRatio="none"
          fill="none"
        >
          {[
            28, 52, 84, 44, 96, 128, 76, 54, 112, 142, 92, 62, 118, 82, 46, 94,
            134, 78, 50, 34,
          ].map((h, i) => {
            const x = 190 + i * 10;
            const y = 110 - h / 2;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width="4"
                height={h}
                rx="2"
                fill={i % 2 === 0 ? '#ffffff' : accentColor}
                fillOpacity={i % 3 === 0 ? '0.85' : '0.5'}
              />
            );
          })}
        </svg>
      )}

      {patternId === 'celestial_compass' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.25]"
          viewBox="0 0 400 220"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <circle cx="320" cy="70" r="64" stroke="#ffffff" strokeWidth="1.2" />
          <circle cx="320" cy="70" r="44" stroke={accentColor} strokeWidth="1" strokeDasharray="3 3" />
          <polygon
            points="320,2 332,58 388,70 332,82 320,138 308,82 252,70 308,58"
            fill="#ffffff"
            fillOpacity="0.18"
            stroke="#ffffff"
            strokeWidth="1.2"
          />
          <polygon
            points="320,22 328,62 368,70 328,78 320,118 312,78 272,70 312,62"
            fill={accentColor}
            fillOpacity="0.28"
          />
        </svg>
      )}

      {patternId === 'japanese_seigaiha' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.22]"
          viewBox="0 0 400 220"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            <pattern
              id="seigaiha-waves"
              width="60"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <path d="M 0 30 A 30 30 0 0 1 60 30" stroke="#ffffff" strokeWidth="1.2" />
              <path d="M 10 30 A 20 20 0 0 1 50 30" stroke={accentColor} strokeWidth="1.2" />
              <path d="M 20 30 A 10 10 0 0 1 40 30" stroke="#ffffff" strokeWidth="1.2" />
            </pattern>
          </defs>
          <rect width="400" height="220" fill="url(#seigaiha-waves)" />
        </svg>
      )}

      {patternId === 'crystal_lattice' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.23]"
          viewBox="0 0 400 220"
          preserveAspectRatio="none"
          fill="none"
        >
          {[0, 60, 120, 180, 240, 300, 360].map((x) => (
            <React.Fragment key={x}>
              <line
                x1={x}
                y1="0"
                x2={x + 110}
                y2="220"
                stroke="#ffffff"
                strokeWidth="1.1"
              />
              <line
                x1={x + 110}
                y1="0"
                x2={x}
                y2="220"
                stroke={accentColor}
                strokeWidth="1.1"
              />
            </React.Fragment>
          ))}
        </svg>
      )}
    </div>
  );
};
