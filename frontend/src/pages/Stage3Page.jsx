import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProtectedLayout } from "../components/ProtectedLayout";
import api from "../lib/api";
import { toast } from "sonner";
import { Loader2, Package } from "lucide-react";

const CAPACITIES = ["250ml", "500ml", "1L", "2L", "5L"];

export default function Stage3Page() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ worker_name: "", packaging_capacity: "500ml" });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/batches/${batchId}`);
        if (data.stage < 2) {
          toast.warning("Complete Stage 2 first");
          navigate(`/batch/${batchId}`);
          return;
        }
        if (data.stage >= 3) {
          toast.info("Stage 3 already completed");
          navigate(`/batch/${batchId}`);
          return;
        }
        setBatch(data);
      } catch (e) {
        toast.error("Batch not found");
        navigate("/batches");
      } finally {
        setLoading(false);
      }
    })();
  }, [batchId]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/batches/${batchId}/stage3`, form);
      toast.success("Packaging complete! Customer QR ready.");
      navigate(`/batch/${batchId}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ProtectedLayout><div className="text-center py-20 text-[#56675B]">Loading…</div></ProtectedLayout>;
  if (!batch) return null;

  return (
    <ProtectedLayout>
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#F28C28] font-semibold mb-2">
            <Package size={14} /> Stage 3
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1A4331] tracking-tight">Packaging & Bottling</h1>
          <p className="text-[#56675B] mt-1 text-sm">Enter packaging details to generate customer traceability QR.</p>
        </div>

        <div className="bg-[#F3F5F1] border border-[#D8E0D9] rounded-2xl p-4 mb-4 grid grid-cols-3 gap-3 text-xs">
          <InfoMini label="Batch" value={batch.batch_id} mono />
          <InfoMini label="Seed" value={batch.seed_type} />
          <InfoMini label="PIN" value={batch.area_pin} />
        </div>

        <form onSubmit={submit} className="bg-white border border-[#D8E0D9] rounded-2xl p-6 card-elevate space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#56675B] mb-1.5">Packer Name</label>
            <input
              type="text"
              value={form.worker_name}
              onChange={(e) => setForm((f) => ({ ...f, worker_name: e.target.value }))}
              data-testid="stage3-worker"
              required
              className="w-full border border-[#D8E0D9] rounded-lg p-3 focus:ring-2 focus:ring-[#4C8A53] focus:border-transparent outline-none bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#56675B] mb-1.5">Packaging Capacity</label>
            <select
              value={form.packaging_capacity}
              onChange={(e) => setForm((f) => ({ ...f, packaging_capacity: e.target.value }))}
              data-testid="stage3-capacity"
              className="w-full border border-[#D8E0D9] rounded-lg p-3 focus:ring-2 focus:ring-[#4C8A53] focus:border-transparent outline-none bg-white"
            >
              {CAPACITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            data-testid="stage3-submit"
            className="w-full bg-[#1A4331] text-white hover:bg-[#245A42] disabled:opacity-60 transition-colors shadow-sm rounded-xl px-6 py-3 font-medium flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="animate-spin" size={18} />}
            Complete Packaging & Generate Customer QR
          </button>
        </form>
      </div>
    </ProtectedLayout>
  );
}

const InfoMini = ({ label, value, mono }) => (
  <div>
    <div className="uppercase tracking-wider text-[#56675B] font-semibold">{label}</div>
    <div className={`font-semibold text-[#1A4331] mt-0.5 break-all ${mono ? "font-data text-[11px]" : "text-sm"}`}>{value}</div>
  </div>
);
