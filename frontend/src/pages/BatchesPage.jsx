import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProtectedLayout } from "../components/ProtectedLayout";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { Search, ChevronRight, Package2 } from "lucide-react";

const STAGE_LABELS = { 1: "Procured", 2: "Extracted", 3: "Packaged" };
const STAGE_COLORS = { 1: "#F28C28", 2: "#4C8A53", 3: "#1A4331" };

export default function BatchesPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (stageFilter) params.stage = stageFilter;
      const { data } = await api.get("/batches", { params });
      setBatches(data);
    } catch (e) {
      toast.error("Failed to load batches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [stageFilter]);

  return (
    <ProtectedLayout>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#1A4331] tracking-tight">Batches</h1>
          <p className="text-[#56675B] mt-1 text-sm">
            {user?.role === "admin" ? "All procurement & production batches" : "Scan a QR or pick a batch to update"}
          </p>
        </div>
        {user?.role === "admin" && (
          <Link
            to="/procurement"
            data-testid="batches-new-batch-link"
            className="bg-[#1A4331] text-white hover:bg-[#245A42] transition-colors shadow-sm rounded-xl px-5 py-2.5 font-medium text-sm text-center"
          >
            + New Procurement
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#56675B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search by Batch ID..."
            data-testid="batches-search-input"
            className="w-full border border-[#D8E0D9] rounded-lg p-2.5 pl-10 bg-white focus:ring-2 focus:ring-[#4C8A53] focus:border-transparent outline-none text-sm"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          data-testid="batches-stage-filter"
          className="border border-[#D8E0D9] rounded-lg p-2.5 bg-white text-sm text-[#1A4331] focus:ring-2 focus:ring-[#4C8A53] outline-none"
        >
          <option value="">All stages</option>
          <option value="1">Procured only</option>
          <option value="2">Extracted</option>
          <option value="3">Packaged</option>
        </select>
        <button
          onClick={load}
          data-testid="batches-refresh-button"
          className="bg-[#F28C28] text-white hover:bg-[#D97B20] transition-colors rounded-xl px-5 py-2.5 font-medium text-sm"
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#56675B]">Loading…</div>
      ) : batches.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-[#D8E0D9] rounded-2xl">
          <Package2 className="mx-auto text-[#4C8A53] mb-3" size={48} />
          <p className="text-[#56675B]">No batches yet</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="batches-list">
          {batches.map((b) => (
            <Link
              key={b.batch_id}
              to={`/batch/${b.batch_id}`}
              data-testid={`batch-row-${b.batch_id}`}
              className="block bg-white border border-[#D8E0D9] rounded-2xl p-4 sm:p-5 card-elevate hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs uppercase tracking-wider text-[#56675B] font-semibold">{b.seed_type}</span>
                    <span
                      className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider text-white"
                      style={{ background: STAGE_COLORS[b.stage] }}
                    >
                      {STAGE_LABELS[b.stage]}
                    </span>
                  </div>
                  <div className="font-data font-semibold text-[#1A4331] text-sm sm:text-base break-all">{b.batch_id}</div>
                  <div className="mt-1 text-xs text-[#56675B]">
                    PIN {b.area_pin} · {new Date(b.procurement_date).toLocaleDateString()}
                    {user?.role === "admin" && b.total_quantity_kg ? ` · ${b.total_quantity_kg} kg` : ""}
                  </div>
                </div>
                <ChevronRight className="text-[#56675B] group-hover:text-[#1A4331] flex-shrink-0" size={20} />
              </div>
              {/* Progress bar */}
              <div className="mt-3 flex gap-1">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className="flex-1 h-1.5 rounded-full"
                    style={{ background: b.stage >= s ? STAGE_COLORS[s] : "#E5E7EB" }}
                  />
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </ProtectedLayout>
  );
}
