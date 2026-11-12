'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  BookOpen,
  Image as ImageIcon,
  Users,
  HelpCircle,
  Mail,
  CheckSquare,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';

interface AdminShellProps {
  admin: {
    uid: string;
    email: string;
    displayName: string;
    role: string;
  };
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/content', label: 'Wedding Content', icon: FileText },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/story', label: 'Our Story', icon: BookOpen },
  { href: '/admin/gallery', label: 'Gallery', icon: ImageIcon },
  { href: '/admin/party', label: 'Wedding Party', icon: Users },
  { href: '/admin/qa', label: 'Q&A', icon: HelpCircle },
  { href: '/admin/invitations', label: 'Invitations', icon: Mail },
  { href: '/admin/rsvps', label: 'RSVPs', icon: CheckSquare },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminShell({ admin, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-editorialBorder bg-warmWhite">
        <div className="p-6 border-b border-editorialBorder">
          <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
            Wedding Organizer Suite
          </p>
          <h1 className="mt-1 font-cormorant text-2xl font-medium text-charcoal">
            Atelier Administration
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 font-montserrat text-xs transition-colors ${
                  isActive
                    ? 'bg-charcoal text-ivory font-medium'
                    : 'text-mutedGray hover:bg-ivory hover:text-charcoal'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? 'text-softGold' : 'text-mutedGray'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-editorialBorder space-y-3 bg-ivory/40">
          <Link
            href="/"
            target="_blank"
            className="flex w-full items-center justify-center gap-2 border border-softGold bg-warmWhite px-3 py-2 font-montserrat text-[11px] uppercase tracking-wider text-charcoal hover:bg-charcoal hover:text-ivory transition-colors"
          >
            <span>View Public Invitation</span>
            <ExternalLink className="h-3 w-3" />
          </Link>

          <div className="flex items-center justify-between pt-1">
            <div className="truncate pr-2">
              <p className="font-montserrat text-xs font-medium text-charcoal truncate">
                {admin.displayName}
              </p>
              <p className="font-montserrat text-[10px] text-mutedGray truncate">
                {admin.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign out of administrator dashboard"
              className="p-2 text-mutedGray hover:text-charcoal"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header & Drawer */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-editorialBorder bg-warmWhite px-4 py-3.5">
        <div>
          <p className="font-montserrat text-[9px] uppercase tracking-editorial text-softGold">
            Organizer Dashboard
          </p>
          <p className="font-cormorant text-xl font-medium text-charcoal">
            Atelier Administration
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 border border-editorialBorder bg-ivory text-charcoal"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-charcoal/60" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="w-72 max-w-[85vw] h-full bg-warmWhite p-5 flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-editorialBorder">
                <span className="font-cormorant text-2xl text-charcoal">Navigation</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-mutedGray"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/admin'
                      ? pathname === '/admin'
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 font-montserrat text-xs ${
                        isActive
                          ? 'bg-charcoal text-ivory font-medium'
                          : 'text-mutedGray hover:bg-ivory hover:text-charcoal'
                      }`}
                    >
                      <Icon className="h-4 w-4 text-softGold" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-editorialBorder space-y-3">
              <Link
                href="/"
                target="_blank"
                className="flex w-full items-center justify-center gap-2 border border-softGold bg-ivory px-3 py-2 font-montserrat text-xs text-charcoal"
              >
                <span>Open Public Invitation</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 border border-charcoal bg-charcoal px-3 py-2 font-montserrat text-xs text-ivory"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}

