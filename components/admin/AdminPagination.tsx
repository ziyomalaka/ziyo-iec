type AdminPaginationProps = {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
};

export default function AdminPagination({ page, totalPages, onPage }: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="min-h-11 rounded-lg border border-[#E8EDF5] bg-white px-3 py-1.5 text-sm disabled:opacity-50"
      >
        Oldingi
      </button>
      <span className="text-sm text-[#64748B]">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="min-h-11 rounded-lg border border-[#E8EDF5] bg-white px-3 py-2 text-sm disabled:opacity-50"
      >
        Keyingi
      </button>
    </div>
  );
}
