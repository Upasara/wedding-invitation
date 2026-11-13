'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  MailOpen,
  BookOpen,
  Calendar,
  Images,
  Users,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export interface FloatingNavItem {
  id: string;
  href: string;
  label: string;
  ariaLabel: string;
  icon:
    | 'hero'
    | 'invitation'
    | 'story'
    | 'events'
    | 'gallery'
    | 'party'
    | 'rsvp'
    | 'qa';
  isPrimary?: boolean;
}

interface FloatingNavProps {
  visible: boolean;
  monogram: string;
  visibility: {
    hero: boolean;
    invitationMessage: boolean;
    story: boolean;
    events: boolean;
    gallery: boolean;
    weddingParty: boolean;
    rsvp: boolean;
    faq: boolean;
  };
  counts: {
    events: number;
    gallery: number;
    weddingParty: number;
    faqs: number;
  };
}

function NavIcon({
  type,
  isActive,
}: {
  type: FloatingNavItem['icon'];
  isActive: boolean;
}) {
  const className = `h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${
    isActive ? 'text-[#8C6D46]' : 'text-charcoal/75 group-hover:text-charcoal'
  }`;

  switch (type) {
    case 'hero':
      return <Sparkles className={className} aria-hidden="true" />;
    case 'invitation':
      return <MailOpen className={className} aria-hidden="true" />;
    case 'story':
      return <BookOpen className={className} aria-hidden="true" />;
    case 'events':
      return <Calendar className={className} aria-hidden="true" />;
    case 'gallery':
      return <Images className={className} aria-hidden="true" />;
    case 'party':
      return <Users className={className} aria-hidden="true" />;
    case 'rsvp':
      return <CheckCircle2 className={className} aria-hidden="true" />;
    case 'qa':
      return <HelpCircle className={className} aria-hidden="true" />;
  }
}

export function FloatingNav({
  visible,
  monogram,
  visibility,
  counts,
}: FloatingNavProps) {
  const navScrollRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const items = useMemo<FloatingNavItem[]>(() => {
    const list: FloatingNavItem[] = [];

    if (visibility.hero) {
      list.push({
        id: 'hero',
        href: '#hero',
        label: monogram || 'Home',
        ariaLabel: 'Jump to top hero section',
        icon: 'hero',
      });
    }
    if (visibility.invitationMessage) {
      list.push({
        id: 'invitation-message',
        href: '#invitation-message',
        label: 'Invitation',
        ariaLabel: 'Navigate to formal invitation message',
        icon: 'invitation',
      });
    }
    if (visibility.story) {
      list.push({
        id: 'our-story',
        href: '#our-story',
        label: 'Our Story',
        ariaLabel: 'Navigate to our story',
        icon: 'story',
      });
    }
    if (visibility.events && counts.events > 0) {
      list.push({
        id: 'events',
        href: '#events',
        label: 'Events',
        ariaLabel: 'Navigate to wedding events',
        icon: 'events',
      });
    }
    if (visibility.gallery && counts.gallery > 0) {
      list.push({
        id: 'gallery',
        href: '#gallery',
        label: 'Gallery',
        ariaLabel: 'Navigate to photo gallery',
        icon: 'gallery',
      });
    }
    if (visibility.weddingParty && counts.weddingParty > 0) {
      list.push({
        id: 'wedding-party',
        href: '#wedding-party',
        label: 'Wedding Party',
        ariaLabel: 'Navigate to wedding party',
        icon: 'party',
      });
    }
    if (visibility.rsvp) {
      list.push({
        id: 'rsvp',
        href: '#rsvp',
        label: 'RSVP',
        ariaLabel: 'Navigate to RSVP section',
        icon: 'rsvp',
        isPrimary: true,
      });
    }
    if (visibility.faq && counts.faqs > 0) {
      list.push({
        id: 'qa',
        href: '#qa',
        label: 'Q&A',
        ariaLabel: 'Navigate to questions and answers',
        icon: 'qa',
      });
    }

    return list;
  }, [visibility, counts, monogram]);

  const [activeId, setActiveId] = useState<string>(
    () => items[0]?.id ?? 'hero'
  );

  // Track currently visible section via IntersectionObserver + scroll bottom fallback
  useEffect(() => {
    if (!visible || typeof window === 'undefined' || items.length === 0) return;

    const sectionElements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (sectionElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) -
              Math.abs(b.boundingClientRect.top)
          );

        if (intersecting.length > 0 && intersecting[0].target.id) {
          setActiveId(intersecting[0].target.id);
        }
      },
      {
        rootMargin: '-25% 0px -55% 0px',
        threshold: [0, 0.2, 0.5],
      }
    );

    sectionElements.forEach((el) => observer.observe(el));

    const handleScrollFallback = () => {
      const scrollY = window.scrollY;
      if (scrollY < 120 && items[0]) {
        setActiveId(items[0].id);
        return;
      }

      const viewportMid = scrollY + window.innerHeight * 0.4;
      let current = items[0].id;
      for (const el of sectionElements) {
        if (el.offsetTop <= viewportMid) {
          current = el.id;
        }
      }
      setActiveId(current);
    };

    window.addEventListener('scroll', handleScrollFallback, { passive: true });

    const handleHashChange = () => {
      const hashId = window.location.hash.replace(/^#/, '');
      if (hashId && items.some((i) => i.id === hashId)) {
        setActiveId(hashId);
      }
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScrollFallback);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [visible, items]);

  // Gently center the active pill item inside the horizontal mobile scroll container
  useEffect(() => {
    const container = navScrollRef.current;
    const activeEl = itemRefs.current[activeId];
    if (!container || !activeEl) return;

    const targetLeft =
      activeEl.offsetLeft -
      container.clientWidth / 2 +
      activeEl.clientWidth / 2;

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'smooth',
      });
    }
  }, [activeId]);

  if (items.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-40 w-max max-w-[calc(100vw-1rem)]">
          <motion.div
            key="floating-bottom-nav"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav
              aria-label="Invitation sections"
              className="rounded-full border border-softGold/50 bg-ivory/90 px-1.5 py-1.5 shadow-[0_12px_36px_-10px_rgba(28,28,28,0.16),0_4px_12px_-4px_rgba(197,168,128,0.22)] backdrop-blur-md sm:px-2.5 sm:py-1.5"
            >
              <div
                ref={navScrollRef}
                className="no-scrollbar flex flex-nowrap items-center gap-0.5 overflow-x-auto sm:gap-1"
              >
                {items.map((item) => {
                  const isActive = activeId === item.id;
                  const isHeroMonogram = item.icon === 'hero';

                  return (
                    <a
                      key={item.id}
                      ref={(el) => {
                        itemRefs.current[item.id] = el;
                      }}
                      href={item.href}
                      aria-label={item.ariaLabel}
                      aria-current={isActive ? 'location' : undefined}
                      onClick={() => setActiveId(item.id)}
                      className={`group relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[10px] font-montserrat uppercase tracking-wider transition-all duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-softGold sm:px-3.5 sm:py-2 sm:text-[11px] sm:tracking-luxury ${
                        isActive
                          ? 'bg-softGold/20 text-[#8C6D46] ring-1 ring-softGold/50 font-medium shadow-sm'
                          : item.isPrimary
                          ? 'border border-softGold/50 bg-warmWhite/80 text-charcoal hover:bg-softGold/15'
                          : 'text-charcoal/80 hover:bg-softGold/10 hover:text-charcoal'
                      }`}
                    >
                      <NavIcon type={item.icon} isActive={isActive} />
                      <span
                        className={
                          isHeroMonogram
                            ? 'font-cormorant text-sm sm:text-base italic tracking-wider normal-case'
                            : ''
                        }
                      >
                        {item.label}
                      </span>
                    </a>
                  );
                })}
              </div>
            </nav>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
