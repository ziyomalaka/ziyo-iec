"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import AdminPagination from "@/components/admin/AdminPagination";
import ApplicationKindBadge, {
  ApplicationSourceBadge,
  ApplicationStatusBadge,
} from "@/components/admin/ApplicationKindBadge";
import {
  decideApplication,
  getClientAppeals,
  getClientApplications,
  getClientCourseProgress,
  getSupervisorAppealsAll,
  getSupervisorApplications,
  getSupervisorClient,
  getSupervisorClients,
  getSupervisorClientsAll,
  updateClientStatus,
  updateSupervisorClientPassword,
} from "@/lib/api/admin-supervisor";
import {
  createNotification,
  deleteNotification,
  getNotifications,
  notificationErrorMessage,
} from "@/lib/api/notifications";
import { ApiError } from "@/lib/api/errors";
import { parsePositiveInt } from "@/lib/api/unwrap";
import type {
  AccountStatus,
  AppealResponse,
  ClientApplication,
  ClientDetail,
  ClientListItem,
} from "@/lib/api/types/admin";
import {
  accountBadge,
  accountStatusLabel,
  appealStatusLabel,
  applicationStatusLabel,
  uiLabel,
} from "@/lib/admin/labels";
import { formatApplicationEvent } from "@/lib/dashboard/utils";
import { applicationSupervisorCommentDraft } from "@/lib/dashboard/course-application";
import NotificationItem from "@/components/dashboard/ui/NotificationItem";
import { useNotifications } from "@/components/dashboard/layout/NotificationsContext";
import { normalizeProgramType } from "@/lib/auth/program";
import { cn } from "@/lib/cn";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import ClientProgramTabs from "@/components/admin/ClientProgramTabs";
import ClientRetrainingTypeTabs from "@/components/admin/ClientRetrainingTypeTabs";
import { resolveApplicationKind } from "@/lib/admin/application-kind";
import { personInitials } from "@/lib/dashboard/staff-public-label";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import {
  CLIENTS_FORBIDDEN_MESSAGE,
  applyClientListFilters,
  clientRetrainingLabel,
  countClientsByProgram,
  countClientsByRetraining,
  filterClientsByProgram,
  hydrateClientRegistrations,
  paginateList,
  parseClientProgramParam,
  parseClientRetrainingParam,
  rememberClientRegistration,
  type ClientProgramFilter,
  type ClientRetrainingFilter,
} from "@/lib/admin/client-program";
import {
  assignedSupervisorLabel,
  clientDirectionLabel,
  clientFullName,
  clientProgramTitle,
  clientSourceBadge,
  clientSubtypeTitle,
} from "@/lib/admin/client-source";
import type { Notification } from "@/lib/dashboard/types";
import { formatUzDateTime } from "@/lib/dashboard/utils";

type Tab = "applications" | "clients" | "notifications";
type Decision = "processing" | "approved" | "rejected" | "archived";

const APPLICATION_STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "pending", label: "Kutilmoqda" },
  { value: "approved", label: "Tasdiqlangan" },
  { value: "rejected", label: "Rad etilgan" },
  { value: "", label: "Barchasi" },
];

function err(error: unknown) {
  if (error instanceof ApiError && error.status === 403) return CLIENTS_FORBIDDEN_MESSAGE;
  return error instanceof ApiError ? error.message : "So'rov bajarilmadi";
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Nusxa olindi");
  } catch {
    toast.error("Nusxa olinmadi");
  }
}

function PasswordValue({ value }: { value?: string }) {
  if (!value) return <span className="text-[#64748B]">—</span>;
  return (
    <span className="inline-flex max-w-full items-center gap-2">
      <span className="break-all font-mono text-[#0C2340]">{value}</span>
      <button type="button" onClick={() => void copyText(value)} className="shrink-0 text-xs text-[#0756F5] hover:underline">
        Nusxa
      </button>
    </span>
  );
}

function clientUserId(client: ClientListItem) {
  const row = client as ClientListItem & { user_id?: number; userId?: number };
  return parsePositiveInt(row.user_id) ?? parsePositiveInt(row.userId) ?? parsePositiveInt(row.id);
}

function tabFromQuery(value: string | null): Tab {
  if (value === "notifications" || value === "clients" || value === "applications") return value;
  return "applications";
}

export default function SupervisorView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = tabFromQuery(searchParams.get("tab"));
  const { unreadCount } = useNotifications();

  const openTab = (id: Tab) => {
    if (id === "applications") {
      router.replace("/admin/supervisor");
      return;
    }
    const params = new URLSearchParams();
    params.set("tab", id);
    if (id === "clients") {
      params.set("program", searchParams.get("program") || "MALAKA_OSHIRISH");
      const retraining = searchParams.get("retraining");
      if (retraining) params.set("retraining", retraining);
    }
    router.replace(`/admin/supervisor?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Nazorat" description="Mijoz holati va arizalarni hal qilish." className="mb-0" />
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["applications", "Arizalar"],
            ["clients", "Mijozlar"],
            ["notifications", "Chat"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => openTab(id)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold transition-colors",
              tab === id
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "border border-border/80 bg-white text-primary-dark hover:bg-surface"
            )}
          >
            {label}
            {id === "notifications" && (unreadCount ?? 0) > 0 ? (
              <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[11px]">{unreadCount}</span>
            ) : null}
          </button>
        ))}
      </div>
      {tab === "applications" ? (
        <ApplicationsTab />
      ) : tab === "clients" ? (
        <ClientsTab />
      ) : (
        <SupervisorInboxTab />
      )}
    </div>
  );
}

function ApplicationsTab() {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<ClientApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ClientApplication | null>(null);
  const [decision, setDecision] = useState<Decision>("approved");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getSupervisorApplications({ page, per_page: 10, status });
      setItems(data.items);
      setTotalPages(data.total_pages || 1);
      setSelected((prev) => {
        if (!prev) return prev;
        return data.items.find((item) => item.id === prev.id) ?? prev;
      });
    } catch (error) {
      if (!silent) toast.error(err(error));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useLiveRefresh(() => void load(true));

  const onDecide = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      if (decision === "rejected" && !comment.trim()) {
        toast.error("Rad etish uchun izoh majburiy");
        return;
      }
      await decideApplication(selected.id, { status: decision, comment: comment.trim() || undefined });
      toast.success("Ariza yangilandi");
      setSelected(null);
      setComment("");
      await load();
    } catch (error) {
      toast.error(err(error));
    } finally {
      setSaving(false);
    }
  };

  const openItem = (item: ClientApplication) => {
    setSelected(item);
    setDecision("approved");
    setComment(applicationSupervisorCommentDraft(item));
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#475569]">Holat</label>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="min-h-11 rounded-xl border border-[#E8EDF5] bg-white px-3 text-sm text-[#0C2340] shadow-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
        >
          {APPLICATION_STATUS_FILTERS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {items.length === 0 ? (
              <p className="rounded-2xl border border-[#E8EDF5] bg-white px-4 py-10 text-center text-sm text-[#64748B] shadow-sm">
                Arizalar topilmadi
              </p>
            ) : (
              items.map((item) => {
                const kind = resolveApplicationKind(item);
                return (
                  <article key={item.id} className="rounded-2xl border border-[#E8EDF5] bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-[#0C2340]">{item.client_name ?? "—"}</p>
                        <p className="mt-0.5 break-all text-xs text-[#64748B]">{item.client_email || "—"}</p>
                      </div>
                      <ApplicationStatusBadge
                        status={item.status}
                        label={item.status_label || applicationStatusLabel[item.status]}
                      />
                    </div>
                    <div className="mt-3">
                      <ApplicationKindBadge kind={kind} />
                    </div>
                    <p className="mt-3 text-xs text-[#64748B]">{formatApplicationEvent(item)}</p>
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                    >
                      Hal qilish
                    </button>
                  </article>
                );
              })
            )}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-[#E8EDF5] bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Mijoz</th>
                    <th className="px-4 py-3">Sarlavha</th>
                    <th className="px-4 py-3">Turi</th>
                    <th className="px-4 py-3">Manba</th>
                    <th className="px-4 py-3">Holat</th>
                    <th className="px-4 py-3">Sana</th>
                    <th className="px-4 py-3">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-[#64748B]">
                        Arizalar topilmadi
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const kind = resolveApplicationKind(item);
                      return (
                        <tr key={item.id} className="border-t border-[#E8EDF5] align-top">
                          <td className="px-4 py-4">
                            <p className="font-semibold text-[#0C2340]">{item.client_name ?? "—"}</p>
                            <p className="mt-0.5 break-all text-xs text-[#64748B]">{item.client_email || "—"}</p>
                          </td>
                          <td className="px-4 py-4 text-[#0C2340]">{item.title || "—"}</td>
                          <td className="px-4 py-4">
                            <ApplicationKindBadge kind={kind} />
                          </td>
                          <td className="px-4 py-4">
                            <ApplicationSourceBadge label={kind.sourceLabel} />
                          </td>
                          <td className="px-4 py-4">
                            <ApplicationStatusBadge
                              status={item.status}
                              label={item.status_label || applicationStatusLabel[item.status]}
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-[#475569]">{formatApplicationEvent(item)}</td>
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => openItem(item)}
                              className="min-h-11 font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                            >
                              Hal qilish
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />

      <DashboardModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Arizani hal qilish"
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setSelected(null)} className="min-h-11 rounded-xl border border-[#E8EDF5] px-4 text-sm">
              Bekor
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void onDecide()}
              className="min-h-11 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
            >
              Saqlash
            </button>
          </>
        }
      >
        {selected ? (
          <div className="space-y-3 text-sm">
            <p><strong>Mijoz:</strong> {selected.client_name}</p>
            <p className="break-all text-[#64748B]">{selected.client_email}</p>
            <p><strong>Sarlavha:</strong> {selected.title}</p>
            <div className="flex flex-wrap items-center gap-2">
              <strong>Turi:</strong>
              <ApplicationKindBadge item={selected} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <strong>Manba:</strong>
              <ApplicationSourceBadge label={resolveApplicationKind(selected).sourceLabel} />
            </div>
            <label className="block">
              Qaror
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value as Decision)}
                className="mt-1 min-h-11 w-full rounded-xl border border-[#E8EDF5] px-3"
              >
                <option value="processing">Ko'rib chiqilmoqda</option>
                <option value="approved">Tasdiqlash</option>
                <option value="rejected">Rad etish</option>
                <option value="archived">Arxiv</option>
              </select>
            </label>
            <label className="block">
              Izoh
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-[#E8EDF5] px-3 py-2"
              />
            </label>
          </div>
        ) : null}
      </DashboardModal>
    </div>
  );
}

function ClientsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const program = parseClientProgramParam(searchParams.get("program"));
  const retrainingType = parseClientRetrainingParam(searchParams.get("retraining"));
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [counts, setCounts] = useState<Partial<Record<ClientProgramFilter, number>>>({});
  const [retrainingCounts, setRetrainingCounts] = useState<Partial<Record<ClientRetrainingFilter, number>>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<ClientListItem[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [apps, setApps] = useState<ClientApplication[]>([]);
  const [appeals, setAppeals] = useState<AppealResponse[]>([]);
  const [progress, setProgress] = useState<Record<string, unknown>[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [notifyClient, setNotifyClient] = useState<ClientListItem | null>(null);

  const setListPlace = (nextProgram: ClientProgramFilter, nextRetraining = retrainingType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "clients");
    params.set("program", nextProgram);
    if (nextProgram === "QAYTA_TAYYORLASH") {
      params.set("retraining", nextRetraining || "UMUMIY");
    } else {
      params.delete("retraining");
    }
    router.replace(`/admin/supervisor?${params.toString()}`);
    setPage(1);
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const all = await getSupervisorClientsAll();
      const hydrated = await hydrateClientRegistrations(all.items, getSupervisorClient);
      const filtered = applyClientListFilters(hydrated, {
        program,
        retrainingType,
        q: query,
      });
      const paged = paginateList(filtered, page, 10);
      setForbidden(false);
      setItems(paged.items);
      setTotalPages(paged.totalPages);
      setCounts(countClientsByProgram(hydrated));
      setRetrainingCounts(countClientsByRetraining(hydrated));
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setForbidden(true);
        setItems([]);
        if (!silent) toast.error(CLIENTS_FORBIDDEN_MESSAGE);
      } else if (!silent) {
        toast.error(err(error));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, program, query, retrainingType]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: number, silent = false) => {
    try {
      const [client, applications, clientAppeals, courseProgress] = await Promise.all([
        getSupervisorClient(id),
        getClientApplications(id),
        getClientAppeals(id),
        getClientCourseProgress(id),
      ]);
      rememberClientRegistration(id, client.program_type, client.retraining_type);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                program_type: client.program_type,
                retraining_type: client.retraining_type,
                dastur: client.dastur,
                program_label: client.program_label,
              }
            : item
        )
      );
      setDetail((prev) => ({
        ...client,
        password: client.password || (silent ? prev?.password : client.password),
      }));
      setApps(applications);
      setAppeals(clientAppeals);
      setProgress(courseProgress);
      if (!silent) setNewPassword("");
    } catch (error) {
      if (!silent) toast.error(err(error));
    }
  };

  useLiveRefresh(() => {
    void load(true);
    if (detail) void openDetail(detail.id, true);
  });

  const onStatus = async (id: number, next: AccountStatus) => {
    try {
      await updateClientStatus(id, next);
      toast.success("Holat yangilandi");
      await load();
      if (detail?.id === id) {
        setDetail(await getSupervisorClient(id));
      }
    } catch (error) {
      toast.error(err(error));
    }
  };

  const onSetPassword = async () => {
    if (!detail || savingPassword) return;
    setSavingPassword(true);
    try {
      const updated = await updateSupervisorClientPassword(detail.id, newPassword);
      const password = updated.password || newPassword.trim();
      setDetail((prev) =>
        prev ? { ...prev, ...updated, id: prev.id, password: password || prev.password } : { ...updated, id: detail.id }
      );
      setItems((prev) =>
        prev.map((item) =>
          item.id === detail.id ? { ...item, password: password || item.password } : item
        )
      );
      setNewPassword("");
      toast.success(password ? `Yangi parol: ${password}` : "Parol yangilandi");
    } catch (error) {
      toast.error(err(error));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div>
      <ClientProgramTabs
        value={program}
        counts={counts}
        onChange={(next) => setListPlace(next)}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {program === "QAYTA_TAYYORLASH" ? (
          <ClientRetrainingTypeTabs
            value={retrainingType}
            counts={retrainingCounts}
            onChange={(next) => setListPlace("QAYTA_TAYYORLASH", next)}
          />
        ) : (
          <span />
        )}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Qidirish"
            className="min-h-11 w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm sm:w-56"
          />
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setQuery(q);
            }}
            className="min-h-11 rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white"
          >
            Qidirish
          </button>
        </div>
      </div>
      {loading ? (
        <LoadingState />
      ) : forbidden ? (
        <p className="rounded-xl border border-[#E8EDF5] bg-white px-4 py-8 text-center text-sm text-[#64748B]">
          {CLIENTS_FORBIDDEN_MESSAGE}
        </p>
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          {items.length === 0 ? (
            <p className="rounded-xl border border-[#E8EDF5] bg-white px-4 py-8 text-center text-sm text-[#64748B]">
              Mijozlar yo&apos;q
            </p>
          ) : (
            items.map((item) => (
              <article key={item.id} className="rounded-xl border border-[#E8EDF5] bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-[#0C2340]">
                      {item.full_name || [item.first_name, item.last_name].filter(Boolean).join(" ")}
                    </p>
                    <p className="break-all text-xs text-[#64748B]">{item.email ?? "—"}</p>
                    <p className="mt-1 text-xs text-[#94A3B8]">ID: {item.public_id ?? item.id}</p>
                    <p className="mt-1 text-xs font-medium text-[#2563EB]">{clientSourceBadge(item)}</p>
                    <p className="mt-1 text-xs text-[#475569]">Yo‘nalish: {clientDirectionLabel(item)}</p>
                  </div>
                  <DashboardBadge variant={accountBadge(item.account_status)}>
                    {item.status_label || uiLabel(item.account_status, accountStatusLabel)}
                  </DashboardBadge>
                </div>
                <div className="mt-3">
                  <PasswordValue value={item.password} />
                </div>
                <select
                  value={item.account_status ?? "active"}
                  onChange={(e) => void onStatus(item.id, e.target.value as AccountStatus)}
                  className="mt-3 min-h-11 w-full rounded-md border border-[#E8EDF5] px-2 py-1"
                >
                  <option value="active">Faol</option>
                  <option value="inactive">Faol emas</option>
                  <option value="blocked">Bloklangan</option>
                </select>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void openDetail(item.id)}
                    className="min-h-11 rounded-lg border border-[#E8EDF5] text-sm font-medium text-[#0756F5]"
                  >
                    Ko&apos;rish
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifyClient(item)}
                    className="min-h-11 rounded-lg border border-[#0756F5] text-sm font-medium text-[#0756F5]"
                  >
                    Chatni ochish
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
        <div className="hidden overflow-hidden rounded-xl border border-[#E8EDF5] bg-white md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-sm">
              <thead className="bg-[#F7F9FC] text-left text-[#64748B]">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Ism</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Dastur</th>
                  <th className="px-4 py-3 font-medium">Turi</th>
                  <th className="px-4 py-3 font-medium">Yo‘nalish</th>
                  <th className="px-4 py-3 font-medium">Parol</th>
                  <th className="px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3 font-medium">Amal</th>
                  <th className="px-4 py-3 font-medium">Chat</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-[#64748B]">
                      Mijozlar yo'q
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-[#E8EDF5]">
                      <td className="px-4 py-3">{item.public_id ?? item.id}</td>
                      <td className="px-4 py-3">{item.full_name || [item.first_name, item.last_name].filter(Boolean).join(" ")}</td>
                      <td className="px-4 py-3">{item.email ?? "—"}</td>
                      <td className="px-4 py-3">{clientProgramTitle(item)}</td>
                      <td className="px-4 py-3">{clientSourceBadge(item)}</td>
                      <td className="px-4 py-3">{clientDirectionLabel(item)}</td>
                      <td className="px-4 py-3">
                        <PasswordValue value={item.password} />
                      </td>
                      <td className="px-4 py-3">
                        <DashboardBadge variant={accountBadge(item.account_status)}>
                          {item.status_label || uiLabel(item.account_status, accountStatusLabel)}
                        </DashboardBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => void openDetail(item.id)} className="text-[#0756F5] hover:underline">
                            Ko'rish
                          </button>
                          <select
                            value={item.account_status ?? "active"}
                            onChange={(e) => void onStatus(item.id, e.target.value as AccountStatus)}
                            className="rounded-md border border-[#E8EDF5] px-2 py-1"
                          >
                            <option value="active">Faol</option>
                            <option value="inactive">Faol emas</option>
                            <option value="blocked">Bloklangan</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setNotifyClient(item)}
                          className="rounded-lg border border-[#0756F5] px-3 py-1.5 text-xs font-medium text-[#0756F5] hover:bg-[#EEF4FF]"
                        >
                          Chatni ochish
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
      {!forbidden ? <AdminPagination page={page} totalPages={totalPages} onPage={setPage} /> : null}

      <DashboardModal
        open={!!notifyClient}
        onClose={() => setNotifyClient(null)}
        title="Chatni ochish"
        size="md"
      >
        {notifyClient ? (
          <SendNotificationForm client={notifyClient} onSent={() => setNotifyClient(null)} />
        ) : null}
      </DashboardModal>

      <DashboardModal open={!!detail} onClose={() => setDetail(null)} title="Mijoz tafsilotlari" size="lg">
        {detail ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] p-4">
              <p><strong>Mijoz:</strong> {clientFullName(detail)}</p>
              <p className="mt-1"><strong>Email / telefon:</strong> {[detail.email, detail.phone_number ?? detail.phone].filter(Boolean).join(" · ") || "—"}</p>
              <p className="mt-1"><strong>Dastur:</strong> {clientProgramTitle(detail)}</p>
              {clientSubtypeTitle(detail) ? (
                <p className="mt-1"><strong>Turi:</strong> {clientSubtypeTitle(detail)}</p>
              ) : null}
              <p className="mt-1"><strong>Yo‘nalish:</strong> {clientDirectionLabel(detail, apps)}</p>
              <p className="mt-1"><strong>Mas’ul nazoratchi:</strong> {assignedSupervisorLabel(detail)}</p>
            </div>
            <p>
              <strong>Holat:</strong>{" "}
              {detail.status_label || uiLabel(detail.account_status, accountStatusLabel)}
            </p>
            <p className="flex flex-wrap items-start gap-2">
              <strong>Parol:</strong>
              <PasswordValue value={detail.password} />
            </p>
            <div className="rounded-xl border border-[#E8EDF5] bg-[#F7F9FC] p-3">
              <label className="block font-semibold">Yangi parol</label>
              <p className="mt-1 text-xs text-[#64748B]">Bo'sh qoldirsangiz, parol avtomatik yaratiladi.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ixtiyoriy parol"
                  className="min-h-11 w-full min-w-0 flex-1 rounded-lg border border-[#E8EDF5] bg-white px-3 py-2"
                />
                <button
                  type="button"
                  disabled={savingPassword}
                  onClick={() => void onSetPassword()}
                  className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {savingPassword ? "Saqlanmoqda..." : "O'rnatish"}
                </button>
              </div>
            </div>
            <p>
              <strong>Holat:</strong>{" "}
              {detail.status_label || uiLabel(detail.account_status, accountStatusLabel)}
            </p>
            <div>
              <h4 className="mb-2 font-semibold">Arizalar</h4>
              {apps.length === 0 ? <p className="text-[#64748B]">Yo'q</p> : apps.map((app) => (
                <p key={app.id}>{app.title} — {app.status_label || uiLabel(app.status, applicationStatusLabel)}</p>
              ))}
            </div>
            <div>
              <h4 className="mb-2 font-semibold">Murojaatlar</h4>
              {appeals.length === 0 ? <p className="text-[#64748B]">Yo'q</p> : appeals.map((appeal) => (
                <p key={appeal.id}>{appeal.subject ?? `#${appeal.id}`} — {appeal.status_label || uiLabel(appeal.status, appealStatusLabel)}</p>
              ))}
            </div>
            <div>
              <h4 className="mb-2 font-semibold">Kurs jarayoni</h4>
              <p className="text-[#64748B]">{progress.length === 0 ? "Hozircha ma'lumot yo'q" : `${progress.length} yozuv`}</p>
            </div>
          </div>
        ) : null}
      </DashboardModal>
    </div>
  );
}

function SendNotificationForm({
  client,
  onSent,
}: {
  client: ClientListItem;
  onSent: () => void;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const userId = clientUserId(client);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    if (!userId) {
      toast.error("Foydalanuvchi ID topilmadi");
      return;
    }
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!trimmedTitle || !trimmedMessage) {
      toast.error("Sarlavha va xabar to'ldirilishi shart");
      return;
    }

    setSending(true);
    try {
      await createNotification({
        user_id: userId,
        title: trimmedTitle,
        message: trimmedMessage,
      });
      toast.success("Bildirishnoma muvaffaqiyatli yuborildi.");
      setTitle("");
      setMessage("");
      onSent();
    } catch (error) {
      toast.error(notificationErrorMessage(error, "Bildirishnoma yuborilmadi"));
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
      <div className="rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] p-3 text-sm">
        <p className="font-semibold text-[#0C2340]">{clientFullName(client)}</p>
        <p className="mt-1 text-[#475569]">Dastur: {clientProgramTitle(client)}</p>
        {clientSubtypeTitle(client) ? (
          <p className="text-[#475569]">Turi: {clientSubtypeTitle(client)}</p>
        ) : null}
        <p className="text-[#475569]">Yo‘nalish: {clientDirectionLabel(client)}</p>
      </div>
      <label className="block text-sm font-medium text-[#0C2340]">
        Sarlavha
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={sending}
          className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm font-normal"
        />
      </label>
      <label className="block text-sm font-medium text-[#0C2340]">
        Xabar
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={sending}
          rows={5}
          className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm font-normal"
        />
      </label>
      <button
        type="submit"
        disabled={sending}
        className="rounded-lg bg-[#0756F5] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {sending ? "Yuborilmoqda..." : "Yuborish"}
      </button>
    </form>
  );
}

function threadKey(item: Notification) {
  return item.senderId ? String(item.senderId) : item.senderName || item.id;
}

function appealAsNotification(appeal: AppealResponse): Notification {
  return {
    id: `appeal-${appeal.id || appeal.created_at || appeal.subject || "murojaat"}`,
    title: appeal.subject?.trim() || "Murojaat",
    text: appeal.message?.trim() || "",
    date: appeal.created_at || new Date().toISOString(),
    read: String(appeal.status ?? "").toLowerCase() !== "open",
    category: "system",
    senderId: appeal.client_id,
    senderName: appeal.client_name || appeal.client_email,
    fromAdmin: false,
  };
}

function isInboxNotificationId(id: string) {
  return Boolean(id) && !id.startsWith("appeal-");
}

function extractEmail(...parts: Array<string | undefined>) {
  const match = parts.filter(Boolean).join(" ").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase();
}

function ChatReplyForm({
  userId,
  clientName,
  defaultTitle,
  onSent,
}: {
  userId: number;
  clientName: string;
  defaultTitle?: string;
  onSent?: () => void;
}) {
  const [title, setTitle] = useState(defaultTitle?.trim() || "Javob");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!trimmedTitle || !trimmedMessage) {
      toast.error("Sarlavha va javob to'ldirilishi shart");
      return;
    }
    setSending(true);
    try {
      await createNotification({ user_id: userId, title: trimmedTitle, message: trimmedMessage });
      toast.success(`Javob yuborildi: ${clientName}`);
      setMessage("");
      onSent?.();
    } catch (error) {
      toast.error(notificationErrorMessage(error, "Javob yuborilmadi"));
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={sending}
        placeholder="Sarlavha"
        className="input-field"
      />
      <div className="flex items-end gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={sending}
          rows={2}
          placeholder={`${clientName} ga javob yozing`}
          className="input-field min-h-[3rem] flex-1 resize-none"
        />
        <button type="submit" disabled={sending} className="btn-primary-sm shrink-0 px-4 disabled:opacity-60">
          <Send className="h-4 w-4" strokeWidth={1.75} />
          {sending ? "..." : "Yuborish"}
        </button>
      </div>
    </form>
  );
}

function SupervisorInboxTab() {
  const {
    items,
    unreadCount,
    loading,
    listError,
    markRead,
    markAllRead,
    refresh,
    removeAll,
  } = useNotifications();
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [extraInbox, setExtraInbox] = useState<Notification[]>([]);
  const [appeals, setAppeals] = useState<AppealResponse[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const clearingChat = useRef(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [openDetail, setOpenDetail] = useState<ClientDetail | null>(null);
  const [listPage, setListPage] = useState(1);
  const [lookedUpUserId, setLookedUpUserId] = useState<number | undefined>();
  const [lookupBusy, setLookupBusy] = useState(false);

  const loadChat = useCallback(async (silent = false) => {
    if (!silent) setChatLoading(true);
    try {
      if (clearingChat.current) return;
      const [inbox, appealRows] = await Promise.all([
        (async () => {
          const first = await getNotifications({ page: 1, per_page: 100 }, "/notifications");
          const rows = [...first.items];
          const pages = Math.min(Math.max(1, first.total_pages || 1), 10);
          for (let page = 2; page <= pages; page++) {
            const next = await getNotifications({ page, per_page: first.per_page || 100 }, "/notifications");
            rows.push(...next.items);
          }
          return rows;
        })().catch(() => [] as Notification[]),
        getSupervisorAppealsAll(),
      ]);
      if (clearingChat.current) return;
      setExtraInbox(inbox);
      setAppeals(appealRows);
      setChatError(null);
    } catch (error) {
      if (!silent) setChatError(err(error));
    } finally {
      if (!silent) setChatLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void loadChat();
  }, [refresh, loadChat]);

  useEffect(() => {
    void getSupervisorClientsAll()
      .then((data) => hydrateClientRegistrations(data.items, getSupervisorClient))
      .then((rows) => setClients(rows))
      .catch(() => setClients([]));
  }, []);

  useLiveRefresh(() => {
    if (clearingChat.current) return;
    void refresh();
    void loadChat(true);
  });

  const clientByKey = new Map<string, ClientListItem>();
  for (const item of clients) {
    clientByKey.set(String(item.id), item);
    const uid = clientUserId(item);
    if (uid) clientByKey.set(String(uid), item);
    if (item.email) clientByKey.set(item.email.trim().toLowerCase(), item);
  }

  const findClient = (senderId?: number, senderName?: string, text?: string) => {
    if (senderId) {
      const byId = clientByKey.get(String(senderId));
      if (byId) return byId;
    }
    const email = extractEmail(senderName, text);
    if (email) return clientByKey.get(email);
    return undefined;
  };

  const mergedItems = (() => {
    const byId = new Map<string, Notification>();
    for (const item of [...items, ...extraInbox]) byId.set(item.id, item);
    for (const appeal of appeals) {
      const mapped = appealAsNotification(appeal);
      byId.set(mapped.id, mapped);
    }
    return [...byId.values()];
  })();

  const threads = mergedItems
    .reduce<Array<{ key: string; latest: Notification; unread: number; all: Notification[] }>>((acc, item) => {
      const key = threadKey(item);
      const existing = acc.find((row) => row.key === key);
      if (existing) {
        existing.all.push(item);
        if (!item.read) existing.unread += 1;
        if (new Date(item.date).getTime() > new Date(existing.latest.date).getTime()) existing.latest = item;
        return acc;
      }
      acc.push({ key, latest: item, unread: item.read ? 0 : 1, all: [item] });
      return acc;
    }, [])
    .map((thread) => ({
      ...thread,
      all: [...thread.all].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }))
    .sort((a, b) => new Date(b.latest.date).getTime() - new Date(a.latest.date).getTime());

  const paged = paginateList(threads, listPage, 10);
  const openThread = threads.find((thread) => thread.key === openKey) ?? null;
  const listedClient = openThread
    ? openThread.all.reduce<ClientListItem | undefined>(
        (found, item) => found ?? findClient(item.senderId, item.senderName, item.text),
        undefined
      )
    : undefined;
  const headerClient = openDetail ?? listedClient;
  const threadSenderId = openThread?.all
    .map((item) => item.senderId)
    .find((id): id is number => Boolean(id));
  const threadEmail = openThread
    ? extractEmail(
        openThread.latest.senderName,
        openThread.latest.text,
        ...openThread.all.map((item) => item.senderName),
        ...openThread.all.map((item) => item.text)
      )
    : undefined;
  const replyUserId =
    (headerClient ? clientUserId(headerClient) : undefined) ?? threadSenderId ?? lookedUpUserId;
  const loadingList = (loading || chatLoading) && mergedItems.length === 0;
  const empty = !loadingList && !listError && !chatError && threads.length === 0;

  useEffect(() => {
    if (!openThread) {
      setOpenDetail(null);
      return;
    }
    const id = listedClient?.id ?? threadSenderId;
    if (!id) {
      setOpenDetail(null);
      return;
    }
    let cancelled = false;
    void getSupervisorClient(id)
      .then((detail) => {
        if (!cancelled) setOpenDetail(detail);
      })
      .catch(() => {
        if (!cancelled) setOpenDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [openKey, listedClient?.id, threadSenderId]);

  useEffect(() => {
    const known =
      (openDetail ? clientUserId(openDetail) : undefined) ??
      (listedClient ? clientUserId(listedClient) : undefined) ??
      threadSenderId;
    if (known || !openKey || !threadEmail) {
      setLookedUpUserId(undefined);
      setLookupBusy(false);
      return;
    }
    let cancelled = false;
    setLookupBusy(true);
    void getSupervisorClients({ q: threadEmail, per_page: 10 })
      .then((res) => {
        if (cancelled) return;
        const match =
          res.items.find((item) => item.email?.trim().toLowerCase() === threadEmail) ??
          res.items.find((item) => clientUserId(item));
        setLookedUpUserId(match ? clientUserId(match) : undefined);
      })
      .catch(() => {
        if (!cancelled) setLookedUpUserId(undefined);
      })
      .finally(() => {
        if (!cancelled) setLookupBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openKey, listedClient?.id, openDetail, threadSenderId, threadEmail]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            void refresh();
            void loadChat();
          }}
          className="btn-outline-sm"
        >
          Yangilash
        </button>
        {threads.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              if (!window.confirm("Barcha xabarlar o'chiriladi. Davom etasizmi?")) return;
              void (async () => {
                clearingChat.current = true;
                const toDelete = [...items, ...extraInbox].filter((item) => isInboxNotificationId(item.id));
                setOpenKey(null);
                setExtraInbox([]);
                setAppeals([]);
                try {
                  await removeAll();
                  await Promise.allSettled(
                    toDelete.map((item) => deleteNotification(item.id, "/notifications"))
                  );
                  setExtraInbox([]);
                } finally {
                  clearingChat.current = false;
                }
              })();
            }}
            className="inline-flex min-h-11 items-center rounded-xl border border-[#FECACA] bg-white px-4 text-sm font-semibold text-[#EF3340] hover:bg-[#FEF2F2]"
          >
            Hammasini o&apos;chirish
          </button>
        ) : null}
        {(unreadCount ?? 0) > 0 ? (
          <button type="button" onClick={() => markAllRead()} className="btn-outline-sm text-primary">
            Hammasini o&apos;qilgan deb belgilash
          </button>
        ) : null}
      </div>
      {loadingList ? (
        <LoadingState />
      ) : (listError || chatError) && mergedItems.length === 0 ? (
        <p className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-8 text-center text-sm text-[#B91C1C]">
          {chatError || listError}
        </p>
      ) : empty ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-blue text-primary">
            <MessageCircle className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <p className="text-base font-semibold text-primary-dark">Hozircha suhbat yo&apos;q</p>
          <p className="mt-2 max-w-sm text-sm text-muted">Mijoz murojaatlari shu yerda ochiladi.</p>
        </div>
      ) : openThread ? (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-[0_4px_24px_-4px_rgba(15,35,64,0.08)]">
          <div className="flex items-center gap-3 border-b border-border/70 px-3 py-3 sm:px-4">
            <button
              type="button"
              onClick={() => setOpenKey(null)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary hover:bg-surface-blue"
              aria-label="Chatlar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-blue text-sm font-bold text-primary">
              {personInitials(headerClient ? clientFullName(headerClient) : openThread.latest.senderName)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-bold text-primary-dark">
                {headerClient ? clientFullName(headerClient) : openThread.latest.senderName || "Mijoz"}
              </h3>
              {headerClient ? (
                <p className="truncate text-xs text-muted">
                  {clientProgramTitle(headerClient)}
                  {clientSubtypeTitle(headerClient)
                    ? ` · ${clientRetrainingLabel(headerClient.retraining_type, headerClient.program_type)}`
                    : ""}
                  {` · ${clientDirectionLabel(headerClient)}`}
                </p>
              ) : (
                <p className="truncate text-xs text-muted">Dastur ma'lumoti backend javobida yo'q</p>
              )}
            </div>
          </div>
          <div className="bg-hero min-h-[280px] space-y-3 p-4 sm:min-h-[360px] sm:p-5">
            {openThread.all.map((item) => (
              <NotificationItem
                key={item.id}
                notification={item}
                onMarkRead={isInboxNotificationId(item.id) ? markRead : undefined}
                replyTo="sender"
                replyUserId={replyUserId}
                variant="thread"
                outgoing={item.fromAdmin}
                allowReply={false}
              />
            ))}
          </div>
          <div className="border-t border-border/70 bg-white p-3 sm:p-4">
            {replyUserId ? (
              <ChatReplyForm
                key={`${replyUserId}-${openThread.latest.id}`}
                userId={replyUserId}
                clientName={headerClient ? clientFullName(headerClient) : openThread.latest.senderName || "Mijoz"}
                defaultTitle={openThread.latest.title ? `Re: ${openThread.latest.title}` : "Javob"}
                onSent={() => {
                  void refresh();
                  void loadChat();
                }}
              />
            ) : lookupBusy ? (
              <p className="text-sm text-muted">Mijoz ID qidirilmoqda...</p>
            ) : (
              <p className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                Javob yuborish uchun mijoz ID backend javobida yo‘q.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-[0_4px_24px_-4px_rgba(15,35,64,0.08)]">
          {paged.items.map((thread, index) => {
            const client = findClient(thread.latest.senderId, thread.latest.senderName, thread.latest.text);
            const name = client ? clientFullName(client) : thread.latest.senderName || "Mijoz";
            return (
              <button
                key={thread.key}
                type="button"
                onClick={() => {
                  setOpenKey(thread.key);
                  thread.all.forEach((item) => {
                    if (!item.read && isInboxNotificationId(item.id)) markRead(item.id);
                  });
                }}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface",
                  index !== 0 && "border-t border-border/60",
                  thread.unread > 0 && "bg-[#F8FAFF]"
                )}
              >
                <div className="relative shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-blue text-sm font-bold text-primary">
                    {personInitials(name)}
                  </div>
                  {thread.unread > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                      {thread.unread}
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate font-semibold text-primary-dark">{name}</p>
                    <p className="shrink-0 text-[11px] text-slate-400">{formatUzDateTime(thread.latest.date)}</p>
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-primary">
                    {client ? clientSourceBadge(client) : "Murojaat"}
                    {client ? ` · ${clientDirectionLabel(client)}` : ""}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{thread.latest.text || thread.latest.title}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {!openThread ? <AdminPagination page={paged.page} totalPages={paged.totalPages} onPage={setListPage} /> : null}
    </div>
  );
}
