"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { getAuthUser } from "@/lib/auth/session";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import AdminPagination from "@/components/admin/AdminPagination";
import {
  decideApplication,
  getClientAppeals,
  getClientApplications,
  getClientCourseProgress,
  getSupervisorApplications,
  getSupervisorClient,
  getSupervisorClients,
  updateClientStatus,
  updateSupervisorClientPassword,
} from "@/lib/api/admin-supervisor";
import { createNotification, notificationErrorMessage } from "@/lib/api/notifications";
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
  applicationBadge,
  applicationStatusLabel,
  uiLabel,
} from "@/lib/admin/labels";
import { formatApplicationEvent } from "@/lib/dashboard/utils";
import { applicationSupervisorCommentDraft } from "@/lib/dashboard/course-application";
import NotificationItem from "@/components/dashboard/ui/NotificationItem";
import { useNotifications } from "@/components/dashboard/layout/NotificationsContext";
import { cn } from "@/lib/cn";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";

type Tab = "applications" | "clients" | "notifications";
type Decision = "processing" | "approved" | "rejected" | "archived";

function err(error: unknown) {
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

function clientLabel(client: ClientListItem) {
  const name = (client.full_name || [client.first_name, client.last_name].filter(Boolean).join(" ")).trim();
  return name || client.email || `Foydalanuvchi #${client.id}`;
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
    router.replace(`/admin/supervisor${id === "applications" ? "" : `?tab=${id}`}`);
  };

  return (
    <div>
      <PageHeader title="Nazorat" description="Mijoz holati va arizalarni hal qilish." />
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["applications", "Arizalar"],
            ["clients", "Mijozlar"],
            ["notifications", "Bildirishnomalar"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => openTab(id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium",
              tab === id ? "bg-[#0756F5] text-white" : "border border-[#E8EDF5] bg-white text-[#0C2340]"
            )}
          >
            {label}
            {id === "notifications" && unreadCount > 0 ? (
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

  return (
    <div>
      <div className="mb-4">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-[#E8EDF5] bg-white px-3 py-2 text-sm"
        >
          {["pending", "processing", "approved", "rejected", "archived"].map((value) => (
            <option key={value} value={value}>
              {applicationStatusLabel[value]}
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
            <p className="rounded-xl border border-[#E8EDF5] bg-white px-4 py-8 text-center text-sm text-[#64748B]">
              Arizalar yo&apos;q
            </p>
          ) : (
            items.map((item) => (
              <article key={item.id} className="rounded-xl border border-[#E8EDF5] bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-[#0C2340]">{item.client_name ?? "—"}</p>
                    <p className="break-all text-xs text-[#64748B]">{item.client_email}</p>
                  </div>
                  <DashboardBadge variant={applicationBadge(item.status)}>
                    {item.status_label || uiLabel(item.status, applicationStatusLabel)}
                  </DashboardBadge>
                </div>
                <p className="mt-2 break-words text-sm text-[#0C2340]">{item.title}</p>
                <p className="mt-1 text-xs text-[#64748B]">
                  {item.type ?? "—"} · {formatApplicationEvent(item)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(item);
                    setDecision("approved");
                    setComment(applicationSupervisorCommentDraft(item));
                  }}
                  className="mt-3 min-h-11 w-full rounded-lg bg-[#0756F5] text-sm font-medium text-white"
                >
                  Hal qilish
                </button>
              </article>
            ))
          )}
        </div>
        <div className="hidden overflow-hidden rounded-xl border border-[#E8EDF5] bg-white md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-[#F7F9FC] text-left text-[#64748B]">
                <tr>
                  <th className="px-4 py-3 font-medium">Mijoz</th>
                  <th className="px-4 py-3 font-medium">Sarlavha</th>
                  <th className="px-4 py-3 font-medium">Turi</th>
                  <th className="px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3 font-medium">Sana</th>
                  <th className="px-4 py-3 font-medium">Amal</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">
                      Arizalar yo'q
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-[#E8EDF5]">
                      <td className="px-4 py-3">
                        <div>{item.client_name ?? "—"}</div>
                        <div className="text-xs text-[#64748B]">{item.client_email}</div>
                      </td>
                      <td className="px-4 py-3">{item.title}</td>
                      <td className="px-4 py-3">{item.type ?? "—"}</td>
                      <td className="px-4 py-3">
                        <DashboardBadge variant={applicationBadge(item.status)}>
                          {item.status_label || uiLabel(item.status, applicationStatusLabel)}
                        </DashboardBadge>
                      </td>
                      <td className="px-4 py-3">{formatApplicationEvent(item)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(item);
                            setDecision("approved");
                            setComment(applicationSupervisorCommentDraft(item));
                          }}
                          className="text-[#0756F5] hover:underline"
                        >
                          Hal qilish
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
      <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />

      <DashboardModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Arizani hal qilish"
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm">
              Bekor
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void onDecide()}
              className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Saqlash
            </button>
          </>
        }
      >
        {selected ? (
          <div className="space-y-3 text-sm">
            <p><strong>Mijoz:</strong> {selected.client_name}</p>
            <p><strong>Sarlavha:</strong> {selected.title}</p>
            <label className="block">
              Qaror
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value as Decision)}
                className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2"
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
                className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2"
              />
            </label>
          </div>
        ) : null}
      </DashboardModal>
    </div>
  );
}

function ClientsTab() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AccountStatus | "">("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [apps, setApps] = useState<ClientApplication[]>([]);
  const [appeals, setAppeals] = useState<AppealResponse[]>([]);
  const [progress, setProgress] = useState<Record<string, unknown>[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [notifyClient, setNotifyClient] = useState<ClientListItem | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getSupervisorClients({ page, per_page: 10, status, q: query });
      setItems(data.items);
      setTotalPages(data.total_pages || 1);
    } catch (error) {
      if (!silent) toast.error(err(error));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, query, status]);

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
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Qidirish"
          className="min-h-11 w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm sm:w-auto"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as AccountStatus | "");
            setPage(1);
          }}
          className="min-h-11 rounded-lg border border-[#E8EDF5] bg-white px-3 py-2 text-sm"
        >
          <option value="">Hammasi</option>
          <option value="active">Faol</option>
          <option value="inactive">Faol emas</option>
          <option value="blocked">Bloklangan</option>
        </select>
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
      {loading ? (
        <LoadingState />
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
                    Bildirishnoma
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
        <div className="hidden overflow-hidden rounded-xl border border-[#E8EDF5] bg-white md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-[#F7F9FC] text-left text-[#64748B]">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Ism</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Parol</th>
                  <th className="px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3 font-medium">Amal</th>
                  <th className="px-4 py-3 font-medium">Bildirishnoma</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">
                      Mijozlar yo'q
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-[#E8EDF5]">
                      <td className="px-4 py-3">{item.public_id ?? item.id}</td>
                      <td className="px-4 py-3">{item.full_name || [item.first_name, item.last_name].filter(Boolean).join(" ")}</td>
                      <td className="px-4 py-3">{item.email ?? "—"}</td>
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
                          Bildirishnoma
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
      <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />

      <DashboardModal
        open={!!notifyClient}
        onClose={() => setNotifyClient(null)}
        title="Bildirishnoma yuborish"
        size="md"
      >
        {notifyClient ? (
          <SendNotificationForm client={notifyClient} onSent={() => setNotifyClient(null)} />
        ) : null}
      </DashboardModal>

      <DashboardModal open={!!detail} onClose={() => setDetail(null)} title="Mijoz tafsilotlari" size="lg">
        {detail ? (
          <div className="space-y-4 text-sm">
            <p><strong>Ism:</strong> {detail.full_name}</p>
            <p><strong>Email:</strong> {detail.email}</p>
            <p><strong>Telefon:</strong> {detail.phone_number ?? "—"}</p>
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
      <p className="text-sm text-[#64748B]">
        Foydalanuvchi: <span className="font-medium text-[#0C2340]">{clientLabel(client)}</span>
      </p>
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

function SupervisorInboxTab() {
  const {
    items,
    unreadCount,
    loading,
    listError,
    page,
    totalPages,
    setPage,
    markRead,
    markAllRead,
    refresh,
    remove,
    removeAll,
  } = useNotifications();
  const role = getAuthUser()?.role;

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const empty = !loading && !listError && items.length === 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-xl border border-[#E8EDF5] bg-white px-4 py-2 text-sm font-medium text-[#0C2340] hover:bg-[#F7F9FC]"
        >
          Yangilash
        </button>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Barcha xabarlar o'chiriladi. Davom etasizmi?")) {
                removeAll();
              }
            }}
            className="rounded-xl border border-[#FECACA] bg-white px-4 py-2 text-sm font-medium text-[#EF3340] hover:bg-[#FEF2F2]"
          >
            Hammasini o&apos;chirish
          </button>
        ) : null}
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => markAllRead()}
            className="rounded-xl border border-[#E8EDF5] bg-white px-4 py-2 text-sm font-medium text-[#2563EB] hover:bg-[#F7F9FC]"
          >
            Hammasini o&apos;qilgan deb belgilash
          </button>
        ) : null}
      </div>
      {role === "it" ? (
        <p className="mb-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
          Mijoz javobi backendda faqat <strong>nazoratchi</strong> inboxiga tushadi. IT akkaunti bilan kirilganda
          bu ro‘yxat bo‘sh chiqishi mumkin.
        </p>
      ) : null}
      {loading && items.length === 0 ? (
        <LoadingState />
      ) : listError && items.length === 0 ? (
        <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-8 text-center text-sm text-[#B91C1C]">
          {listError}
        </p>
      ) : empty ? (
        <p className="rounded-xl border border-[#E8EDF5] bg-white px-4 py-8 text-center text-sm text-[#64748B]">
          Hozircha mijoz javoblari yo&apos;q.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <NotificationItem
              key={item.id}
              notification={item}
              onMarkRead={markRead}
              onDelete={remove}
              replyTo="sender"
            />
          ))}
        </div>
      )}
      <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}
