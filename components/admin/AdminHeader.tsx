"use client";

import { useEffect, useRef, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Bell, ChevronDown, Menu } from "lucide-react";
import { getAuthUser } from "@/lib/auth/session";
import { canAccessSupervisor, roleLabel } from "@/lib/auth/roles";
import { signOut } from "@/lib/auth/sign-out";
import LogoutConfirmModal from "@/components/dashboard/layout/LogoutConfirmModal";
import { useNotifications } from "@/components/dashboard/layout/NotificationsContext";

const titles: Record<string, string> = {
  "/admin/software/qualification/material/create": "Material qo'shish",
  "/admin/software/qualification": "Malaka oshirish",
  "/admin/software/mandatory": "Majburiy blog",
  "/admin/management": "Boshqaruv",
  "/admin/supervisor": "Nazorat",
};

type AdminHeaderProps = {
  onMenuClick: () => void;
};

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getAuthUser();
  const showInbox = canAccessSupervisor(user?.role);
  const { items, unreadCount, listError, loading, markRead, markAllRead, refresh } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const title = Object.entries(titles).find(([path]) => pathname.startsWith(path))?.[1] ?? "Admin";
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.nickname || "Admin";
  const inboxHref = "/admin/supervisor?tab=notifications";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setSaving(true);
    try {
      await signOut();
      router.push("/kirish");
    } finally {
      setSaving(false);
      setLogoutOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#e8edf5] bg-white">
      <div className="flex h-[80px] items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-11 w-11 items-center justify-center rounded-[9px] border border-[#dce5f2] text-[#0756F5] lg:hidden"
            aria-label="Menyu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="truncate text-[24px] font-bold text-[#0b1938]">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {showInbox ? (
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((open) => {
                    const next = !open;
                    if (next) void refresh();
                    return next;
                  });
                }}
                className="relative flex h-11 w-11 items-center justify-center rounded-[9px] border border-[#dce5f2] text-[#536287]"
                aria-label="Bildirishnomalar"
              >
                <Bell className="h-5 w-5" strokeWidth={1.75} />
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ef233c] px-1 text-[11px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>
              {notifOpen ? (
                <div className="absolute top-full right-0 z-50 mt-2 w-[360px] overflow-hidden rounded-[9px] border border-[#DFE7F2] bg-white shadow-[0_8px_24px_rgba(15,35,70,0.12)]">
                  <div className="flex items-center justify-between border-b border-[#E8EDF5] px-4 py-3">
                    <p className="text-[14px] font-semibold text-[#101a37]">Mijoz javoblari</p>
                    <div className="flex items-center gap-3">
                      {unreadCount > 0 ? (
                        <button type="button" className="text-[12px] font-medium text-[#0756F5]" onClick={() => markAllRead()}>
                          O&apos;qildi
                        </button>
                      ) : null}
                      <Link href={inboxHref} className="text-[12px] font-medium text-[#0756F5]" onClick={() => setNotifOpen(false)}>
                        Barchasi
                      </Link>
                    </div>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {loading ? (
                      <p className="px-4 py-6 text-center text-[13px] text-[#64748B]">Yuklanmoqda...</p>
                    ) : listError ? (
                      <p className="px-4 py-6 text-center text-[13px] text-[#B91C1C]">
                        Bildirishnomalarni yuklashda xatolik yuz berdi.
                      </p>
                    ) : items.length === 0 ? (
                      <p className="px-4 py-6 text-center text-[13px] text-[#64748B]">
                        Hozircha bildirishnomalar mavjud emas.
                      </p>
                    ) : (
                      items.slice(0, 5).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          className="flex w-full flex-col items-start gap-1 border-b border-[#EDF1F6] px-4 py-3 text-left last:border-0 hover:bg-[#F7FAFE]"
                          onClick={() => {
                            if (!n.read) markRead(n.id);
                            setNotifOpen(false);
                            router.push(inboxHref);
                          }}
                        >
                          <div className="flex w-full items-start justify-between gap-2">
                            <p className="text-[13px] font-semibold text-[#101a37]">{n.title}</p>
                            {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0756F5]" />}
                          </div>
                          <p className="text-[12px] font-medium text-[#0C2340]">
                            Kimdan: {n.senderName || (n.senderId ? `Mijoz #${n.senderId}` : "Mijoz")}
                          </p>
                          <p className="line-clamp-2 text-[12px] text-[#64748B]">{n.text}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-xl border border-[#E8EDF5] px-3 py-2 text-sm"
            >
              <span className="max-w-[160px] truncate font-medium text-[#0C2340]">{name}</span>
              <span className="hidden text-xs text-[#64748B] sm:inline">{roleLabel(user?.role)}</span>
              <ChevronDown className="h-4 w-4 text-[#64748B]" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-[#E8EDF5] bg-white p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setLogoutOpen(true);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Chiqish
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <LogoutConfirmModal
        open={logoutOpen}
        saving={saving}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </header>
  );
}
