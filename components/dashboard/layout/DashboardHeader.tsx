"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Bell, BookOpen, ChevronDown, Menu, Search, User } from "lucide-react";
import { getAuthUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/sign-out";
import { dashboardLabels } from "@/lib/dashboard/labels";
import { getDashboardPageTitle } from "@/lib/dashboard/navigation";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";
import { mapAuthUserToDashboard, getFullName, getShortName } from "@/lib/dashboard/utils";
import BrandLogo from "@/components/ui/BrandLogo";
import { isRetrainingLearningPath } from "@/lib/retraining/learning-chrome";
import LogoutConfirmModal from "@/components/dashboard/layout/LogoutConfirmModal";
import { useDashboardSearch } from "@/components/dashboard/layout/DashboardSearchContext";
import { useNotifications } from "@/components/dashboard/layout/NotificationsContext";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { cn } from "@/lib/cn";

type DashboardHeaderProps = {
  pathname: string;
  onMenuClick: () => void;
};

export default function DashboardHeader({ pathname, onMenuClick }: DashboardHeaderProps) {
  const router = useRouter();
  const { search, setSearch } = useDashboardSearch();
  const {
    items: notifications,
    unreadCount,
    unreadAvailable,
    listError,
    loading: notificationsLoading,
    markRead,
    markAllRead,
  } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutSaving, setLogoutSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const user = mapAuthUserToDashboard(getAuthUser());
  const paths = useStudentProgramPaths();
  const pageTitle = paths.pageTitle?.(pathname) ?? getDashboardPageTitle(pathname);
  const isMyDirectionPage =
    pathname === paths.myCourses || pathname.startsWith(`${paths.base}/my-direction`);
  const hideHeaderSearch = pathname !== paths.courses;
  const isRetrainingLearning =
    paths.kind === "retraining" && isRetrainingLearningPath(pathname, paths.learning);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  useEscapeKey(menuOpen || notifOpen, () => {
    setMenuOpen(false);
    setNotifOpen(false);
  });

  const handleLogout = async () => {
    setLogoutSaving(true);
    try {
      await signOut();
      router.push("/kirish");
    } finally {
      setLogoutSaving(false);
      setLogoutOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full overflow-visible border-b border-[#e8edf5] bg-white pt-[env(safe-area-inset-top)]">
      <div
        className={cn(
          "flex w-full min-w-0 items-center justify-between gap-2 overflow-visible px-3 sm:gap-4 sm:px-6",
          isRetrainingLearning ? "h-14 sm:h-16 lg:h-[72px]" : "h-14 sm:h-16 lg:h-[96px]"
        )}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          <button
            type="button"
            onClick={onMenuClick}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-[9px] border border-[#dce5f2] bg-white text-[#0756F5]",
              isRetrainingLearning ? "" : "lg:hidden"
            )}
            aria-label="Menyu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <Link href={paths.home} className="flex min-w-0 items-center gap-2" aria-label="ZiyoMalaka">
            {isRetrainingLearning ? (
              <>
                <BrandLogo size="xs" className="hidden h-9 w-9 lg:block" />
                <span className="block truncate text-[15px] font-bold leading-none text-[#0C2340] lg:text-[18px]">
                  ZiyoMalaka
                </span>
              </>
            ) : (
              <span className="block truncate text-[15px] font-bold leading-none text-[#0C2340] lg:hidden">
                ZiyoMalaka
              </span>
            )}
          </Link>
          {isRetrainingLearning ? (
            <nav className="hidden min-w-0 items-center gap-1 lg:flex">
              <Link
                href={paths.myCourses}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium",
                  pathname === paths.myCourses || pathname.startsWith(`${paths.myCourses}/`)
                    ? "text-[#0756F5]"
                    : "text-[#475569] hover:bg-[#F7FAFE]"
                )}
              >
                Mening kurslarim
              </Link>
              <Link
                href={paths.home}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium",
                  pathname === paths.home || pathname.startsWith(`${paths.learning}`)
                    ? "text-[#0756F5]"
                    : "text-[#475569] hover:bg-[#F7FAFE]"
                )}
              >
                Qayta tayyorlash
              </Link>
              <Link
                href="/aloqa"
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#475569] hover:bg-[#F7FAFE]"
              >
                Yordam
              </Link>
            </nav>
          ) : null}
          {isRetrainingLearning ? null : isMyDirectionPage ? (
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[9px] border border-[#dce5f2] bg-white text-[#0756F5] lg:flex">
              <BookOpen className="h-5 w-5" strokeWidth={1.75} />
            </span>
          ) : null}
          {isRetrainingLearning ? null : (
          <div className="hidden min-w-0 lg:block">
            {paths.badge ? (
              <span className="mb-1 inline-flex rounded-md bg-[#EEF4FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#2563EB]">
                {paths.badge}
              </span>
            ) : null}
            <h1
              className={cn(
                "min-w-0 truncate font-bold",
                isMyDirectionPage ? "text-[27px] text-[#101A3B]" : "text-[28px] text-[#0b1938]"
              )}
            >
              {pageTitle}
            </h1>
          </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {!hideHeaderSearch ? (
            <div className="relative hidden h-[45px] w-[250px] md:block">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#52627d]" strokeWidth={1.75} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={dashboardLabels.search}
                className="h-[45px] w-full rounded-[9px] border border-[#d7e1ef] bg-white pr-3 pl-10 text-[13px] text-[#101a37] outline-none placeholder:text-[#52627d]"
              />
            </div>
          ) : null}

          <div ref={notifRef} className="relative z-20">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setNotifOpen((open) => !open);
              }}
              className="relative flex h-11 w-11 items-center justify-center rounded-[9px] border border-[#dce5f2] text-[#536287] sm:h-12 sm:w-12"
              aria-label="Bildirishnomalar"
              aria-expanded={notifOpen}
            >
              <Bell className="h-5 w-5" strokeWidth={1.75} />
              {unreadAvailable && unreadCount != null && unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ef233c] px-1 text-[11px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
              {!unreadAvailable ? (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#94A3B8]" aria-hidden />
              ) : null}
            </button>

            {notifOpen && (
              <div className="absolute top-full right-0 z-[80] mt-2 w-[min(22.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[#DFE7F2] bg-white shadow-[0_12px_32px_rgba(15,35,70,0.16)]">
                <div className="flex items-center justify-between border-b border-[#E8EDF5] px-4 py-3">
                  <p className="text-[14px] font-semibold text-[#101a37]">Bildirishnomalar</p>
                  <div className="flex items-center gap-3">
                    {unreadAvailable && unreadCount != null && unreadCount > 0 ? (
                      <button
                        type="button"
                        className="text-[12px] font-medium text-[#0756F5]"
                        onClick={() => markAllRead()}
                      >
                        Hammasini o&apos;qildi
                      </button>
                    ) : null}
                    <Link
                      href={paths.notifications}
                      className="text-[12px] font-medium text-[#0756F5]"
                      onClick={() => setNotifOpen(false)}
                    >
                      Barchasi
                    </Link>
                  </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {notificationsLoading ? (
                    <p className="px-4 py-6 text-center text-[13px] text-[#64748B]">Yuklanmoqda...</p>
                  ) : listError ? (
                    <p className="px-4 py-6 text-center text-[13px] text-[#B91C1C]">{listError}</p>
                  ) : notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-[13px] text-[#64748B]">
                      Hozircha bildirishnomalar mavjud emas.
                    </p>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className="flex w-full flex-col items-start gap-1 border-b border-[#EDF1F6] px-4 py-3 text-left last:border-0 hover:bg-[#F7FAFE]"
                        onClick={() => {
                          if (!n.read) markRead(n.id);
                          setNotifOpen(false);
                          router.push(paths.notifications);
                        }}
                      >
                        <div className="flex w-full items-start justify-between gap-2">
                          <p className="min-w-0 break-words text-[13px] font-semibold text-[#101a37]">{n.title}</p>
                          {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0756F5]" />}
                        </div>
                        <p className="line-clamp-2 text-[12px] text-[#64748B]">{n.text}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div ref={menuRef} className="relative z-20">
            <button
              type="button"
              onClick={() => {
                setNotifOpen(false);
                setMenuOpen((open) => !open);
              }}
              className="flex min-h-11 items-center gap-2 rounded-xl px-1 hover:bg-[#F7FAFE]"
              aria-label="Profil menyusi"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full bg-[#0756F5] font-bold text-white",
                  isRetrainingLearning ? "h-9 w-9 text-[13px] sm:h-10 sm:w-10" : "h-10 w-10 text-[14px] sm:h-[46px] sm:w-[46px]"
                )}
              >
                {user.avatarInitials}
              </div>
              <span
                className={cn(
                  "hidden max-w-[180px] truncate text-[14px] font-semibold text-[#101c3d]",
                  isRetrainingLearning ? "lg:inline" : "sm:inline"
                )}
              >
                {isRetrainingLearning ? getFullName(user) : getShortName(user)}
              </span>
              <ChevronDown
                className={cn(
                  "hidden h-4 w-4 text-[#536287]",
                  isRetrainingLearning ? "lg:block" : "sm:block",
                  menuOpen && "rotate-180"
                )}
                strokeWidth={1.75}
              />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute top-full right-0 z-[80] mt-2 w-52 overflow-hidden rounded-xl border border-[#DFE7F2] bg-white py-1 shadow-[0_12px_32px_rgba(15,35,70,0.16)]"
              >
                <Link
                  href={paths.profile}
                  role="menuitem"
                  className="flex min-h-11 items-center gap-2 px-4 py-2.5 text-[13px] text-[#35466c] hover:bg-[#F7FAFE]"
                  onClick={() => setMenuOpen(false)}
                >
                  <User className="h-4 w-4" strokeWidth={1.75} /> {dashboardLabels.profile}
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setLogoutOpen(true);
                  }}
                  className="flex min-h-11 w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] text-[#EF3340] hover:bg-red-50"
                >
                  {dashboardLabels.logout}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <LogoutConfirmModal
        open={logoutOpen}
        saving={logoutSaving}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </header>
  );
}
