import {
  Activity,
  BookOpen,
  BookOpenCheck,
  BrainCircuit,
  ChartNoAxesCombined,
  ClipboardList,
  Compass,
  GraduationCap,
  House,
  LibraryBig,
  UserRound,
  Settings2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AppNavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const primaryNavigation: AppNavigationItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: House, description: 'Your preparation at a glance' },
  { label: 'Smart Practice', href: '/smart-practice', icon: BrainCircuit, description: 'Adaptive practice for your goals' },
  { label: 'Practice', href: '/practice', icon: BookOpenCheck, description: 'Practice by ACT section' },
  { label: 'Tests', href: '/tests', icon: ClipboardList, description: 'Full-length and timed tests' },
  { label: 'Review', href: '/review', icon: Activity, description: 'Learn from missed questions' },
  { label: 'Progress', href: '/progress', icon: ChartNoAxesCombined, description: 'Your progress over time' },
  { label: 'Study Plan', href: '/study-plan', icon: GraduationCap, description: 'A plan built around your schedule' },
];

export const secondaryNavigation: AppNavigationItem[] = [
  { label: 'Question Bank', href: '/question-bank', icon: LibraryBig, description: 'Browse practice questions' },
  { label: 'Profile', href: '/profile', icon: UserRound, description: 'Your account profile' },
  { label: 'Settings', href: '/settings', icon: Settings2, description: 'Account and preferences' },
];

export const allNavigation = [...primaryNavigation, ...secondaryNavigation];

export function getNavigationItem(pathname: string) {
  return allNavigation.find((item) => item.href === pathname);
}

export const brandIcon = Compass;
export const bookIcon = BookOpen;
