'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Compass,
  Ellipsis,
  Menu,
  Search,
  Settings2,
  UserRound,
  X,
} from 'lucide-react';
import { getNavigationItem, primaryNavigation, secondaryNavigation } from './app-navigation';
import { SignOutButton } from './auth-forms';

function isCurrent(href: string, pathname: string) {
  return href === pathname;
}

function Brand() {
  return (
    <Link href="/dashboard" className="app-brand" aria-label="Northstar ACT dashboard">
      <span className="app-brand-mark"><Compass size={17} strokeWidth={2.1} /></span>
      <span>northstar<span className="app-brand-suffix">.act</span></span>
    </Link>
  );
}

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <div className="app-nav-group">
        <p className="app-nav-label">YOUR PREP</p>
        <nav className="app-nav-list" aria-label="Main navigation">
          {primaryNavigation.map((item) => {
            const Icon = item.icon;
            const current = isCurrent(item.href, pathname);
            return (
              <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={current ? 'page' : undefined} className={`app-nav-link${current ? ' is-active' : ''}`}>
                <Icon size={17} strokeWidth={current ? 2 : 1.8} aria-hidden="true" />
                <span>{item.label}</span>
                {item.label === 'Smart Practice' && <span className="app-nav-new">NEW</span>}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="app-nav-group app-nav-secondary">
        <p className="app-nav-label">YOUR LIBRARY</p>
        <nav className="app-nav-list" aria-label="Secondary navigation">
          {secondaryNavigation.map((item) => {
            const Icon = item.icon;
            const current = isCurrent(item.href, pathname);
            return <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={current ? 'page' : undefined} className={`app-nav-link${current ? ' is-active' : ''}`}><Icon size={17} strokeWidth={current ? 2 : 1.8} aria-hidden="true" /><span>{item.label}</span></Link>;
          })}
        </nav>
      </div>
    </>
  );
}

function ProfileMenu({ student }: { student: { name: string; email: string } }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="app-profile-wrap" ref={menuRef}>
      <button ref={triggerRef} type="button" className={`app-profile-trigger${open ? ' is-open' : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="app-avatar" aria-hidden="true">{student.name.slice(0, 1).toUpperCase()}</span>
        <span className="app-profile-copy"><span className="app-profile-name">{student.name}</span><span className="app-profile-plan">{student.email}</span></span>
        <ChevronDown className="app-profile-chevron" size={14} aria-hidden="true" />
      </button>
      {open && <div className="app-profile-menu" role="menu" aria-label="Student account">
        <div className="app-profile-menu-heading"><span className="app-avatar app-avatar--large" aria-hidden="true">{student.name.slice(0, 1).toUpperCase()}</span><div><strong>{student.name}</strong><span>{student.email}</span></div></div>
        <div className="app-menu-divider" />
        <Link href="/profile" role="menuitem" className="app-profile-menu-item" onClick={() => setOpen(false)}><UserRound size={15} /> Profile</Link>
        <Link href="/settings" role="menuitem" className="app-profile-menu-item" onClick={() => setOpen(false)}><Settings2 size={15} /> Settings</Link>
        <a href="mailto:support@northstar.act" role="menuitem" className="app-profile-menu-item"><CircleHelp size={15} /> Get help <ArrowUpRight size={12} className="app-menu-external" /></a>
        <div className="app-menu-divider" />
        <SignOutButton className="app-profile-menu-item app-signout-item" menuItem />
      </div>}
    </div>
  );
}

function MobileDrawer({ open, onClose, student }: { open: boolean; onClose: () => void; student: { name: string; email: string } }) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="app-drawer-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="app-drawer" aria-label="Mobile navigation">
        <div className="app-drawer-header"><Brand /><button className="app-icon-button" type="button" onClick={onClose} aria-label="Close navigation"><X size={19} /></button></div>
        <div className="app-drawer-student"><span className="app-avatar" aria-hidden="true">{student.name.slice(0, 1).toUpperCase()}</span><span><strong>{student.name}</strong><small>{student.email}</small></span></div>
        <div className="app-drawer-links"><NavigationLinks onNavigate={onClose} /></div>
      </aside>
    </div>
  );
}

function MobileBottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const quickLinks = primaryNavigation.slice(0, 4);
  const isMoreActive = !quickLinks.some((item) => isCurrent(item.href, pathname));
  return (
    <nav className="app-bottom-nav" aria-label="Quick navigation">
      {quickLinks.map((item) => {
        const Icon = item.icon;
        const current = isCurrent(item.href, pathname);
        return <Link href={item.href} key={item.href} aria-current={current ? 'page' : undefined} className={`app-bottom-link${current ? ' is-active' : ''}`}><Icon size={19} strokeWidth={current ? 2.2 : 1.8} /><span>{item.label === 'Smart Practice' ? 'Smart' : item.label}</span></Link>;
      })}
      <button type="button" onClick={onMore} className={`app-bottom-link${isMoreActive ? ' is-active' : ''}`} aria-label="More sections"><Ellipsis size={20} /><span>More</span></button>
    </nav>
  );
}

export function AppShell({ children, student }: { children: React.ReactNode; student: { name: string; email: string } }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const item = getNavigationItem(pathname);
  const title = item?.label ?? 'Dashboard';
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="app-shell">
      <a className="app-skip-link" href="#main-content">Skip to content</a>
      <aside className="app-desktop-sidebar">
        <div className="app-sidebar-brand"><Brand /></div>
        <NavigationLinks />
        <div className="app-sidebar-bottom">
          <div className="app-sidebar-prompt"><span className="app-prompt-icon"><BookOpen size={15} /></span><p><strong>A little each day.</strong><br />A lot of progress over time.</p></div>
          <a className="app-sidebar-help" href="mailto:support@northstar.act"><CircleHelp size={15} /> Help center <ArrowUpRight size={12} /></a>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="app-header">
          <div className="app-header-start">
            <button type="button" className="app-icon-button app-mobile-menu-trigger" onClick={() => setDrawerOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div className="app-mobile-brand"><Brand /></div>
            <div className="app-header-title"><span className="app-header-breadcrumb">Your prep</span><span className="app-header-separator">/</span><h1>{title}</h1></div>
          </div>
          <div className="app-header-actions">
            <label className="app-header-search"><Search size={15} /><input aria-label="Search" placeholder="Search" /><kbd>⌘ K</kbd></label>
            <button type="button" className="app-icon-button app-notification-button" aria-label="Notifications"><Bell size={17} /><span className="app-notification-dot" /></button>
            <span className="app-header-divider" />
            <ProfileMenu student={student} />
          </div>
        </header>

        <main className="app-page" id="main-content">{children}</main>
      </div>
      <MobileBottomNav onMore={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={closeDrawer} student={student} />
    </div>
  );
}

