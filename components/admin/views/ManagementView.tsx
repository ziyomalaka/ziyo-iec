"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Users, UserPlus, BarChart3 } from "lucide-react";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import StatCard from "@/components/dashboard/ui/StatCard";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import AdminPagination from "@/components/admin/AdminPagination";
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  getManagementClient,
  getManagementClients,
  getManagementReports,
  updateEmployeeRole,
} from "@/lib/api/admin-management";
import { ApiError } from "@/lib/api/errors";
import type {
  ClientDetail,
  ClientListItem,
  EmployeeResponse,
  ManagementReports,
  StaffRole,
} from "@/lib/api/types/admin";
import { staffRoleLabel } from "@/lib/admin/labels";
import { getAuthUser } from "@/lib/auth/session";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { formatDateTime } from "@/lib/dashboard/utils";
import { cn } from "@/lib/cn";

const NICKNAME_RE = /^[a-zA-Z0-9._-]{3,50}$/;
const STAFF_ROLES: StaffRole[] = ["boshqaruv", "nazoratchi"];

type Tab = "employees" | "clients" | "reports";

function err(error: unknown) {
  return error instanceof ApiError ? error.message : "So'rov bajarilmadi";
}

export default function ManagementView() {
  const [tab, setTab] = useState<Tab>("employees");
  const me = getAuthUser();

  return (
    <div>
      <PageHeader title="Boshqaruv" description="Xodimlar, mijozlar (faqat ko'rish) va hisobotlar." />
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["employees", "Xodimlar"],
            ["clients", "Mijozlar"],
            ["reports", "Hisobotlar"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium",
              tab === id ? "bg-[#0756F5] text-white" : "border border-[#E8EDF5] bg-white text-[#0C2340]"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "employees" ? <EmployeesTab meId={me?.id} /> : null}
      {tab === "clients" ? <ClientsTab /> : null}
      {tab === "reports" ? <ReportsTab /> : null}
    </div>
  );
}

function EmployeesTab({ meId }: { meId?: number }) {
  const [items, setItems] = useState<EmployeeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("nazoratchi");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setItems(await getEmployees());
    } catch (error) {
      if (!silent) toast.error(err(error));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useLiveRefresh(() => void load(true));

  const onCreate = async () => {
    if (!NICKNAME_RE.test(nickname.trim())) {
      toast.error("Nickname 3–50 belgi: lotin, raqam, _ . -");
      return;
    }
    if (password.length < 6) {
      toast.error("Parol kamida 6 belgi bo'lishi kerak");
      return;
    }
    setSaving(true);
    try {
      await createEmployee({ nickname: nickname.trim(), password, role });
      toast.success("Xodim qo'shildi");
      setOpen(false);
      setNickname("");
      setPassword("");
      setRole("nazoratchi");
      await load();
    } catch (error) {
      toast.error(err(error));
    } finally {
      setSaving(false);
    }
  };

  const onRole = async (id: number, next: StaffRole) => {
    try {
      await updateEmployeeRole(id, next);
      toast.success("Rol yangilandi");
      await load();
    } catch (error) {
      toast.error(err(error));
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm("Xodimni o'chirasizmi?")) return;
    try {
      await deleteEmployee(id);
      toast.success("Xodim o'chirildi");
      await load();
    } catch (error) {
      toast.error(err(error));
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Xodim qo'shish
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#E8EDF5] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-[#F7F9FC] text-left text-[#64748B]">
              <tr>
                <th className="px-4 py-3 font-medium">Public ID</th>
                <th className="px-4 py-3 font-medium">Nickname</th>
                <th className="px-4 py-3 font-medium">Ism</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Oxirgi kirish</th>
                <th className="px-4 py-3 font-medium">Amal</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">
                    Xodimlar yo'q
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const own = item.id === meId;
                  return (
                    <tr key={item.id} className="border-t border-[#E8EDF5]">
                      <td className="px-4 py-3">{item.public_id ?? item.id}</td>
                      <td className="px-4 py-3 font-medium">{item.nickname ?? "—"}</td>
                      <td className="px-4 py-3">{item.full_name || [item.first_name, item.last_name].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-4 py-3">
                        <select
                          value={item.role}
                          disabled={own}
                          onChange={(e) => void onRole(item.id, e.target.value as StaffRole)}
                          className="rounded-md border border-[#E8EDF5] px-2 py-1 disabled:opacity-50"
                        >
                          {(item.role === "it" ? (["it", ...STAFF_ROLES] as StaffRole[]) : STAFF_ROLES).map(
                            (value) => (
                              <option key={value} value={value}>
                                {item.role === value && item.role_label
                                  ? item.role_label
                                  : staffRoleLabel[value]}
                              </option>
                            )
                          )}
                        </select>
                      </td>
                      <td className="px-4 py-3">{item.last_login_at ? formatDateTime(item.last_login_at) : "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={own}
                          onClick={() => void onDelete(item.id)}
                          className="text-sm text-red-600 hover:underline disabled:opacity-40"
                        >
                          O'chirish
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

      <DashboardModal
        open={open}
        onClose={() => setOpen(false)}
        title="Xodim qo'shish"
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm">
              Bekor
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void onCreate()}
              className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Qo'shish
            </button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <label className="block">
            Nickname
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2"
              placeholder="nazoratchi01"
            />
          </label>
          <label className="block">
            Parol
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2"
            />
          </label>
          <label className="block">
            Rol
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2"
            >
              {STAFF_ROLES.map((value) => (
                <option key={value} value={value}>
                  {staffRoleLabel[value]}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-[#64748B]">
            Xodim keyin nickname + parol bilan o'z paneliga kiradi. Email yuborilmaydi.
          </p>
        </div>
      </DashboardModal>
    </div>
  );
}

function ClientsTab() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ClientDetail | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getManagementClients({ page, per_page: 10, q: query });
      setItems(data.items);
      setTotalPages(data.total_pages || 1);
    } catch (error) {
      if (!silent) toast.error(err(error));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: number, silent = false) => {
    try {
      setDetail(await getManagementClient(id));
    } catch (error) {
      if (!silent) toast.error(err(error));
    }
  };

  useLiveRefresh(() => {
    void load(true);
    if (detail) void openDetail(detail.id, true);
  });

  return (
    <div>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(q);
        }}
      >
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Qidirish"
            className="w-full rounded-lg border border-[#E8EDF5] py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <button type="submit" className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white">
          Qidirish
        </button>
      </form>
      {loading ? (
        <LoadingState />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E8EDF5] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[#F7F9FC] text-left text-[#64748B]">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Ism</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Telefon</th>
                  <th className="px-4 py-3 font-medium">Amal</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                      Mijozlar yo'q
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-[#E8EDF5]">
                      <td className="px-4 py-3">{item.public_id ?? item.id}</td>
                      <td className="px-4 py-3">{item.full_name || [item.first_name, item.last_name].filter(Boolean).join(" ")}</td>
                      <td className="px-4 py-3">{item.email ?? "—"}</td>
                      <td className="px-4 py-3">{item.phone_number ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => void openDetail(item.id)} className="text-[#0756F5] hover:underline">
                          Ko'rish
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />
      <DashboardModal open={!!detail} onClose={() => setDetail(null)} title="Mijoz" size="md">
        {detail ? (
          <div className="space-y-2 text-sm">
            <p><strong>Ism:</strong> {detail.full_name || `${detail.first_name ?? ""} ${detail.last_name ?? ""}`}</p>
            <p><strong>Email:</strong> {detail.email ?? "—"}</p>
            <p><strong>Telefon:</strong> {detail.phone_number ?? "—"}</p>
            <p><strong>Manzil:</strong> {detail.address ?? "—"}</p>
            <p className="text-xs text-[#64748B]">Boshqaruv panelida mijoz faqat ko'riladi.</p>
          </div>
        ) : null}
      </DashboardModal>
    </div>
  );
}

function ReportsTab() {
  const [data, setData] = useState<ManagementReports | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setData(await getManagementReports());
    } catch (error) {
      if (!silent) toast.error(err(error));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useLiveRefresh(() => void load(true));

  if (loading) return <LoadingState />;
  if (!data) return <p className="text-sm text-[#64748B]">Hisobot yuklanmadi</p>;

  return (
    <div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Jami mijozlar" value={data.total_clients} icon={Users} />
        <StatCard label="Shu oy yangi" value={data.new_clients_this_month} icon={UserPlus} />
        <StatCard label="Xodimlar" value={data.total_employees} icon={BarChart3} />
      </div>
      <div className="rounded-xl border border-[#E8EDF5] bg-white p-5">
        <h3 className="mb-3 font-semibold text-[#0C2340]">So'nggi 6 oy ro'yxatdan o'tish</h3>
        <ul className="space-y-2 text-sm">
          {(data.registration_last_6_months ?? []).length === 0 ? (
            <li className="text-[#64748B]">Ma'lumot yo'q</li>
          ) : (
            data.registration_last_6_months?.map((row) => (
              <li key={row.month} className="flex justify-between rounded-lg bg-[#F7F9FC] px-3 py-2">
                <span>{row.month}</span>
                <span className="font-medium">{row.count}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
