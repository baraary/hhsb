import React from 'react';
import {
  ShoppingBag,
  Utensils,
  Home,
  Car,
  HeartPulse,
  Sparkles,
  Tv,
  Gift,
  Briefcase,
  TrendingUp,
  CreditCard,
  Wallet,
  PieChart,
  Archive,
  Settings,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  Tag,
  User,
  Users,
  Check,
  Trash2,
  Edit3,
  Download,
  Upload,
  Moon,
  Sun,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Coffee,
  ShoppingCart,
  Fuel,
  Stethoscope,
  Scissors,
  Plane,
  BookOpen,
  DollarSign,
  Award,
  Layers,
  Lock,
  RefreshCw,
  Palette,
  Shuffle,
  MessageSquare,
  Clipboard,
  Package,
  Link2,
  FileText,
  ShieldCheck,
  X,
  Copy,
  RotateCcw,
} from 'lucide-react';

export type IconName =
  | 'shopping-bag'
  | 'utensils'
  | 'home'
  | 'car'
  | 'heart-pulse'
  | 'sparkles'
  | 'tv'
  | 'gift'
  | 'briefcase'
  | 'trending-up'
  | 'credit-card'
  | 'wallet'
  | 'pie-chart'
  | 'archive'
  | 'settings'
  | 'plus'
  | 'arrow-up'
  | 'arrow-down'
  | 'calendar'
  | 'clock'
  | 'tag'
  | 'user'
  | 'users'
  | 'check'
  | 'trash'
  | 'edit'
  | 'download'
  | 'upload'
  | 'moon'
  | 'sun'
  | 'search'
  | 'filter'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'smartphone'
  | 'coffee'
  | 'shopping-cart'
  | 'fuel'
  | 'stethoscope'
  | 'scissors'
  | 'plane'
  | 'book'
  | 'dollar'
  | 'award'
  | 'layers'
  | 'lock'
  | 'refresh'
  | 'palette'
  | 'shuffle'
  | 'message-square'
  | 'clipboard'
  | 'package'
  | 'link'
  | 'file-text'
  | 'shield'
  | 'x'
  | 'copy'
  | 'rotate-ccw';

const ICON_MAP: Record<string, React.ElementType> = {
  'shopping-bag': ShoppingBag,
  utensils: Utensils,
  home: Home,
  car: Car,
  'heart-pulse': HeartPulse,
  sparkles: Sparkles,
  tv: Tv,
  gift: Gift,
  briefcase: Briefcase,
  'trending-up': TrendingUp,
  'credit-card': CreditCard,
  wallet: Wallet,
  'pie-chart': PieChart,
  archive: Archive,
  settings: Settings,
  plus: Plus,
  'arrow-up': ArrowUpRight,
  'arrow-down': ArrowDownLeft,
  calendar: Calendar,
  clock: Clock,
  tag: Tag,
  user: User,
  users: Users,
  check: Check,
  trash: Trash2,
  edit: Edit3,
  download: Download,
  upload: Upload,
  moon: Moon,
  sun: Sun,
  search: Search,
  filter: Filter,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  smartphone: Smartphone,
  coffee: Coffee,
  'shopping-cart': ShoppingCart,
  fuel: Fuel,
  stethoscope: Stethoscope,
  scissors: Scissors,
  plane: Plane,
  book: BookOpen,
  dollar: DollarSign,
  award: Award,
  layers: Layers,
  lock: Lock,
  refresh: RefreshCw,
  palette: Palette,
  shuffle: Shuffle,
  'message-square': MessageSquare,
  clipboard: Clipboard,
  package: Package,
  link: Link2,
  'file-text': FileText,
  shield: ShieldCheck,
  x: X,
  copy: Copy,
  'rotate-ccw': RotateCcw,
};

export const AVAILABLE_ICONS: { id: IconName; label: string }[] = [
  { id: 'shopping-cart', label: 'خرید روزمره' },
  { id: 'utensils', label: 'رستوران و غذا' },
  { id: 'coffee', label: 'کافه و تنقلات' },
  { id: 'home', label: 'مسکن و خانه' },
  { id: 'car', label: 'خودرو و تردد' },
  { id: 'fuel', label: 'سوخت و بنزین' },
  { id: 'heart-pulse', label: 'سلامت و درمان' },
  { id: 'sparkles', label: 'پوشاک و زیبایی' },
  { id: 'tv', label: 'تفریح و اشتراک' },
  { id: 'gift', label: 'هدیه و مناسبت' },
  { id: 'smartphone', label: 'قبوض و اینترنت' },
  { id: 'plane', label: 'سفر و گردشگری' },
  { id: 'book', label: 'آموزش و کتاب' },
  { id: 'briefcase', label: 'حقوق و دستمزد' },
  { id: 'trending-up', label: 'سرمایه‌گذاری و سود' },
  { id: 'award', label: 'پاداش و پروژه' },
];

interface CircularIconProps {
  name: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'soft' | 'solid' | 'outline' | 'glass';
  className?: string;
}

export const CircularIcon: React.FC<CircularIconProps> = ({
  name,
  color = '#10b981',
  size = 'md',
  variant = 'soft',
  className = '',
}) => {
  const IconComponent = ICON_MAP[name] || Layers;

  const sizeClasses = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-13 h-13',
    xl: 'w-16 h-16',
  }[size];

  const iconSizes = {
    xs: 14,
    sm: 17,
    md: 20,
    lg: 24,
    xl: 28,
  }[size];

  if (variant === 'solid') {
    return (
      <div
        style={{ backgroundColor: color }}
        className={`circular-icon-badge ${sizeClasses} rounded-full flex items-center justify-center shrink-0 text-white shadow-sm relative overflow-hidden ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-black/15 to-white/20 pointer-events-none" />
        <IconComponent size={iconSizes} strokeWidth={2.2} className="relative z-10" />
      </div>
    );
  }

  if (variant === 'glass') {
    return (
      <div
        className={`circular-icon-badge ${sizeClasses} rounded-full flex items-center justify-center shrink-0 bg-white/20 backdrop-blur-md border border-white/30 text-white ${className}`}
      >
        <IconComponent size={iconSizes} strokeWidth={2.2} />
      </div>
    );
  }

  if (variant === 'outline') {
    return (
      <div
        style={{ borderColor: `${color}40`, color }}
        className={`circular-icon-badge ${sizeClasses} rounded-full flex items-center justify-center shrink-0 border-2 bg-transparent ${className}`}
      >
        <IconComponent size={iconSizes} strokeWidth={2.2} />
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: `${color}18`,
        color: color,
        borderColor: `${color}30`,
      }}
      className={`circular-icon-badge ${sizeClasses} rounded-full flex items-center justify-center shrink-0 border relative ${className}`}
    >
      <IconComponent size={iconSizes} strokeWidth={2.2} />
    </div>
  );
};
