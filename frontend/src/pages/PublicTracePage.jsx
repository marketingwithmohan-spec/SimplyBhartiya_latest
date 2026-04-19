import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API } from "../lib/api";
import { MapPin, Wheat, Droplets, Package, CheckCircle2, ShieldCheck, Leaf, Award } from "lucide-react";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_bhartiya-trace/artifacts/ny91w2mk_Simply%20Bhartiya%20logo%20Sticker.png";

export default function PublicTracePage() {
  const { batchId } = useParams();
  const [trace, setTrace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/trace/${batchId}`);
        setTrace(data);
      } catch (e) {
        setError(e?.response?.data?.detail || "Batch not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [batchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-[#56675B]">Loading traceability data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="max-w-md text-center bg-white rounded-2xl p-8 border border-[#D8E0D9]">
          <div className="text-[#EF4444] font-semibold mb-2">Batch not found</div>
          <p className="text-sm text-[#56675B]">The QR code you scanned does not match any product in our system.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(26, 67, 49, 0.92), rgba(26, 67, 49, 0.96)), url(https://images.pexels.com/photos/18346906/pexels-photo-18346906.jpeg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-5 py-12 sm:py-16 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center p-2">
              <img src={LOGO_URL} alt="Simply Bhartiya" className="w-28 h-28 object-contain" style={{ clipPath: "inset(8% 10% 18% 10%)" }} />
            </div>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">Simply Bhartiya</h1>
          <p className="text-sm uppercase tracking-[0.3em] text-[#F28C28] mt-2 font-semibold">Authenticity Verified</p>
          <p className="mt-4 text-white/85 text-base sm:text-lg font-serif italic max-w-xl mx-auto">
            "From our soil to your kitchen — traced with transparency, pressed with tradition."
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <Badge icon={ShieldCheck} label="Verified Origin" />
            <Badge icon={Leaf} label="100% Natural" />
            <Badge icon={Award} label="Cold Pressed" />
          </div>
        </div>
      </div>

      {/* Batch ID strip */}
      <div className="max-w-3xl mx-auto px-5 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl border border-[#D8E0D9] card-elevate p-5 text-center heritage-border" data-testid="trace-header-card">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[#56675B] font-semibold">Batch Identifier</div>
          <div className="font-data text-sm sm:text-base font-bold text-[#1A4331] mt-1 break-all">{trace.batch_id}</div>
          <div className="mt-2 flex justify-center gap-2 flex-wrap">
            <span className="text-xs bg-[#F3F5F1] text-[#1A4331] px-3 py-1 rounded-full uppercase tracking-wider font-semibold">{trace.seed_type}</span>
            {trace.packaging_capacity && (
              <span className="text-xs bg-[#F28C28]/15 text-[#D97B20] px-3 py-1 rounded-full uppercase tracking-wider font-semibold">{trace.packaging_capacity}</span>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-3xl mx-auto px-5 py-10">
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1A4331] mb-6 text-center">Production Journey</h2>

        <div className="space-y-4" data-testid="traceability-timeline">
          <TraceStage
            icon={MapPin}
            title="Sourced from the Heart of Bharat"
            subtitle={`Area PIN ${trace.origin_pin}`}
            date={trace.procurement_date}
            tone="accent"
            desc="Hand-picked seeds from trusted regional farmers."
          />
          <TraceStage
            icon={Droplets}
            title="Cold-Pressed with Tradition"
            subtitle="Wooden ghani technique"
            date={trace.extraction_date}
            tone="secondary"
            desc="Slow-pressed at low temperatures to preserve flavour & nutrients."
            disabled={!trace.extraction_date}
          />
          <TraceStage
            icon={Package}
            title="Bottled with Care"
            subtitle={trace.packaging_capacity || "Packaged"}
            date={trace.packaging_date}
            tone="primary"
            desc="Sealed in food-grade bottles to lock in freshness."
            disabled={!trace.packaging_date}
            last
          />
        </div>

        {trace.completed && (
          <div className="mt-8 bg-[#1A4331] text-white rounded-2xl p-6 text-center">
            <CheckCircle2 className="mx-auto mb-2 text-[#F28C28]" size={36} />
            <h3 className="font-serif text-2xl font-semibold">Authenticity Confirmed</h3>
            <p className="text-sm text-white/80 mt-1">This bottle has completed the full Simply Bhartiya traceability chain.</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center">
          <div className="inline-block">
            <div className="text-xs uppercase tracking-widest text-[#56675B] font-semibold">With gratitude</div>
            <div className="font-serif text-xl text-[#1A4331] font-semibold mt-1">Bharat ki Shuddhata, Aapke Ghar Tak</div>
          </div>
          <div className="mt-6 text-xs text-[#56675B]">© {new Date().getFullYear()} Simply Bhartiya · Every drop traceable</div>
        </div>
      </div>
    </div>
  );
}

const Badge = ({ icon: Icon, label }) => (
  <div className="inline-flex items-center gap-1.5 text-xs bg-white/15 text-white px-3 py-1.5 rounded-full backdrop-blur border border-white/20">
    <Icon size={14} /> <span className="font-medium">{label}</span>
  </div>
);

const TraceStage = ({ icon: Icon, title, subtitle, date, desc, tone, disabled, last }) => {
  const tones = {
    primary: { bg: "#1A4331", text: "#1A4331" },
    secondary: { bg: "#4C8A53", text: "#4C8A53" },
    accent: { bg: "#F28C28", text: "#D97B20" },
  };
  const c = tones[tone] || tones.secondary;
  return (
    <div className={`relative flex gap-4 bg-white rounded-2xl p-5 border-l-4 card-elevate ${disabled ? "opacity-50" : ""}`} style={{ borderColor: c.bg }}>
      {!last && <div className="absolute left-[2.35rem] top-[5rem] bottom-[-1rem] w-0.5 bg-[#D8E0D9]" />}
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white" style={{ background: c.bg }}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <h3 className="font-serif text-xl font-semibold" style={{ color: c.text }}>{title}</h3>
        <div className="text-sm text-[#121F17] mt-0.5">{subtitle}</div>
        {date && <div className="text-xs text-[#56675B] mt-1">{new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</div>}
        {!date && disabled && <div className="text-xs text-[#56675B] mt-1">Pending</div>}
        {desc && <p className="text-sm text-[#56675B] mt-2 italic">{desc}</p>}
      </div>
    </div>
  );
};
