"use client";

import DashboardModal from "@/components/dashboard/ui/DashboardModal";

type LogoutConfirmModalProps = {
  open: boolean;
  saving?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function LogoutConfirmModal({
  open,
  saving,
  onClose,
  onConfirm,
}: LogoutConfirmModalProps) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Hisobdan chiqish"
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="min-h-11 w-full rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm sm:w-auto">
            Yo&apos;q
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="min-h-11 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 sm:w-auto"
          >
            Ha, chiqmoqchiman
          </button>
        </>
      }
    >
      <p className="text-sm text-[#64748B]">Haqiqatan ham hisobdan chiqmoqchimisiz?</p>
    </DashboardModal>
  );
}
