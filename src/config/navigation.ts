import { Shield, Scan, BookOpen, Users, BarChart3, Settings, type LucideIcon } from 'lucide-react';

/**
 * Navigation Configuration
 *
 * Typed, role-aware navigation items.
 * Used by sidebar, mobile nav, and breadcrumbs.
 */

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  /** Feature flag that must be enabled for this item to show */
  featureFlag?: string;
  /** Minimum role required to see this item */
  requiredRole?: 'user' | 'moderator' | 'admin';
  /** Whether this item is disabled (shown but not clickable) */
  disabled?: boolean;
}

export const mainNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    description: 'Overview of threat landscape and scan history',
  },
  {
    title: 'Scanner',
    href: '/scanner',
    icon: Scan,
    description: 'Scan messages, URLs, QR codes, and screenshots',
    featureFlag: 'ENABLE_SCANNER',
  },
  {
    title: 'Threat Intel',
    href: '/threats',
    icon: Shield,
    description: 'Real-time threat intelligence feed',
    featureFlag: 'ENABLE_SCANNER',
  },
  {
    title: 'Community',
    href: '/community',
    icon: Users,
    description: 'Community-reported scams and threats',
    featureFlag: 'ENABLE_COMMUNITY',
  },
  {
    title: 'Academy',
    href: '/academy',
    icon: BookOpen,
    description: 'Cybersecurity courses and quizzes',
    featureFlag: 'ENABLE_ACADEMY',
  },
];

export const adminNavItems: NavItem[] = [
  {
    title: 'Admin',
    href: '/admin',
    icon: Settings,
    description: 'Platform administration and moderation',
    requiredRole: 'admin',
    featureFlag: 'ENABLE_ADMIN',
  },
];
