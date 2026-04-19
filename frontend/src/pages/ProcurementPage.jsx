import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProtectedLayout } from "../components/ProtectedLayout";
import api from "../lib/api";
import { toast } from "sonner";
import { Loader2, Wheat } from "lucide-react";

const SEED_TYPES = [
  { value: "Black Mustard", prefix: "BM" },
  { value: "White Sesame", prefix: "WS" },
  { value: "Groundnut", prefix: "GN" },
  { value: "Coconut", prefix: "CO" },
  { value: "Almond", prefix: "AL" },
];

export default function ProcurementPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    vendor_name: "",
    area_pin: "",
    seed_type: "Black Mustard",
    price_per_kg: "",
    number_of_bags: "",
    size_per_bag: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const totalQty = Number(form.number_of_bags || 0) * Number(form.size_per_bag || 0);
  const totalAmount = totalQty * Number(form.price_per_kg || 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(form.area_pin)) {
      toast.error("Area PIN must be 6 digits");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        vendor_name: form.vendor_name,
        area_pin: form.area_pin,
        seed_type: form.seed_type,
        price_per_kg: Number(form.price_per_kg),
        number_of_bags: Number(form.number_of_bags),
        size_per_bag: Number(form.size_per_bag),
      };
      const { data } = await api.post("/batches", payload);
      toast.success(`Batch ${data.batch_id} created`);
      navigate(`/batch/${data.batch_id}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create batch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedLayout adminOnly>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#F28C28] font-semibold mb-2">
            <Wheat size={14} /> Stage 1
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#1A4331] tracking-tight">New Procurement</h1>
          <p className="text-[#56675B] mt-1 text-sm">Record raw seed purchase. A Batch ID and QR will be generated automatically.</p>
        </div>

        <form onSubmit={submit} className="bg-white border border-[#D8E0D9] rounded-2xl p-6 sm:p-8 card-elevate space-y-4">
          <Field label="Vendor Name">
            <input
              type="text"
              value={form.vendor_name}
              onChange={(e) => set("vendor_name", e.target.value)}
              data-testid="proc-vendor-name"
              required
              className="w-full border border-[#D8E0D9] rounded-lg p-3 focus:ring-2 focus:ring-[#4C8A53] focus:border-transparent outline-none bg-white"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Area PIN (6 digits)">
              <input
                type="text"
                value={form.area_pin}
                onChange={(e) => set("area_pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
                data-testid="proc-area-pin"
                required
                inputMode="numeric"
                className="w-full border border-[#D8E0D9] rounded-lg p-3 focus:ring-2 focus:ring-[#4C8A53] focus:border-transparent outline-none bg-white"
              />
            </Field>
            <Field label="Seed Type">
              <select
                value={form.seed_type}
                onChange={(e) => set("seed_type", e.target.value)}
                data-testid="proc-seed-type"
                className="w-full border border-[#D8E0D9] rounded-lg p-3 focus:ring-2 focus:ring-[#4C8A53] focus:border-transparent outline-none bg-white"
              >
                {SEED_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.value} ({s.prefix})</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Price per KG (₹)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price_per_kg}
                onChange={(e) => set("price_per_kg", e.target.value)}
                data-testid="proc-price-per-kg"
                required
                className="w-full border border-[#D8E0D9] rounded-lg p-3 focus:ring-2 focus:ring-[#4C8A53] focus:border-transparent outline-none bg-white"
              />
            </Field>
            <Field label="Number of Bags">
              <input
                type="number"
                min="0"
                value={form.number_of_bags}
                onChange={(e) => set("number_of_bags", e.target.value)}
                data-testid="proc-number-of-bags"
                required
                className="w-full border border-[#D8E0D9] rounded-lg p-3 focus:ring-2 focus:ring-[#4C8A53] focus:border-transparent outline-none bg-white"
              />
            </Field>
            <Field label="Size per Bag (kg)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.size_per_bag}
                onChange={(e) => set("size_per_bag", e.target.value)}
                data-testid="proc-size-per-bag"
                required
                className="w-full border border-[#D8E0D9] rounded-lg p-3 focus:ring-2 focus:ring-[#4C8A53] focus:border-transparent outline-none bg-white"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-[#D8E0D9]">
            <div className="bg-[#F3F5F1] rounded-lg p-4" data-testid="proc-total-qty">
              <div className="text-xs uppercase tracking-wider text-[#56675B] font-semibold">Total Quantity</div>
              <div className="font-data text-2xl font-bold text-[#1A4331] mt-1">{totalQty.toLocaleString()} kg</div>
            </div>
            <div className="bg-[#F3F5F1] rounded-lg p-4" data-testid="proc-total-amount">
              <div className="text-xs uppercase tracking-wider text-[#56675B] font-semibold">Total Amount</div>
              <div className="font-data text-2xl font-bold text-[#F28C28] mt-1">₹{totalAmount.toLocaleString()}</div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            data-testid="proc-submit-button"
            className="w-full bg-[#1A4331] text-white hover:bg-[#245A42] disabled:opacity-60 transition-colors shadow-sm rounded-xl px-6 py-3 font-medium flex items-center justify-center gap-2 mt-2"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            Create Batch & Generate QR
          </button>
        </form>
      </div>
    </ProtectedLayout>
  );
}

const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-[#56675B] mb-1.5">{label}</label>
    {children}
  </div>
);
