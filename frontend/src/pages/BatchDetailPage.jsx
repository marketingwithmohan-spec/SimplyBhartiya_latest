import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ProtectedLayout } from "../components/ProtectedLayout";
import { useAuth } from "../contexts/AuthContext";
import api, { API } from "../lib/api";
import { toast } from "sonner";
import { Loader2, Printer, CheckCircle2, Circle, ExternalLink, Cog, Package } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_bhartiya-trace/artifacts/ny91w2mk_Simply%20Bhartiya%20logo%20Sticker.png";

const CAPACITIES = ["250ml", "500ml", "1L", "2L", "5L"];

export default function BatchDetailPage() {
  const { batchId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/batches/${batchId}`);
      setBatch(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load batch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [batchId]);

  if (loading || !batch) {
    return (
      <ProtectedLayout>
        <div className="text-center py-20 text-[#56675B]">Loading batch...</div>
      </ProtectedLayout>
    );
  }

  const stage = batch.stage || 1;

  return (
    <ProtectedLayout>
      <div className="mb-6">
        <Link to="/batches" className="text-sm text-[#56675B] hover:text-[#1A4331]" data-testid="batch-back-link">← Back to batches</Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mt-2">
          <div>
            <div className="text-xs uppercase tracking-widest text-[#F28C28] font-semibold mb-1">{batch.seed_type}</div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1A4331] tracking-tight break-all">{batch.batch_id}</h1>
            <p className="text-[#56675B] mt-1 text-sm">Origin PIN {batch.area_pin}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveStage(1)}
              data-testid="view-qr1-button"
              className="bg-[#F28C28] text-white hover:bg-[#D97B20] rounded-xl px-4 py-2 font-medium text-sm flex items-center gap-2"
            >
              <Printer size={16} /> QR Stage {stage >= 3 ? 3 : stage >= 2 ? 2 : 1}
            </button>
          </div>
        </div>
      </div>

      {/* Admin financial summary */}
      {user?.role === "admin" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <InfoCard label="Vendor" value={batch.vendor_name} testid="batch-vendor" />
          <InfoCard label="Price / kg" value={`₹${batch.price_per_kg}`} testid="batch-price" />
          <InfoCard label="Total Qty" value={`${batch.total_quantity_kg} kg`} testid="batch-quantity" />
          <InfoCard label="Total Amount" value={`₹${Number(batch.total_amount || 0).toLocaleString()}`} testid="batch-amount" accent />
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white border border-[#D8E0D9] rounded-2xl p-6 card-elevate mb-6" data-testid="batch-timeline">
        <h3 className="font-serif text-2xl font-semibold text-[#1A4331] mb-4">Production Journey</h3>
        <div className="space-y-4">
          <TimelineStage
            stage={1}
            active={stage >= 1}
            title="Seed Procurement"
            icon={Package}
            date={batch.procurement_date}
            details={[
              { label: "Bags", value: batch.number_of_bags, adminOnly: false },
              { label: "Size/Bag", value: `${batch.size_per_bag} kg`, adminOnly: false },
            ]}
            onViewQR={() => setActiveStage(1)}
            userRole={user?.role}
          />
          <TimelineStage
            stage={2}
            active={stage >= 2}
            title="Oil Extraction"
            icon={Cog}
            date={batch.stage2?.extraction_date}
            details={
              batch.stage2
                ? [
                    { label: "Machine", value: batch.stage2.machine_number },
                    { label: "Worker", value: batch.stage2.worker_name },
                  ]
                : []
            }
            onViewQR={() => setActiveStage(2)}
            actionLabel={stage < 2 ? "Complete Extraction" : null}
            onAction={() => navigate(`/batch/${batch.batch_id}/stage2`)}
          />
          <TimelineStage
            stage={3}
            active={stage >= 3}
            title="Packaging & Bottling"
            icon={Package}
            date={batch.stage3?.packaging_date}
            details={
              batch.stage3
                ? [
                    { label: "Packer", value: batch.stage3.worker_name },
                    { label: "Capacity", value: batch.stage3.packaging_capacity },
                  ]
                : []
            }
            onViewQR={() => setActiveStage(3)}
            actionLabel={stage === 2 ? "Complete Packaging" : null}
            onAction={() => navigate(`/batch/${batch.batch_id}/stage3`)}
            last
          />
        </div>
      </div>

      {stage >= 3 && (
        <Link
          to={`/trace/${batch.batch_id}`}
          target="_blank"
          data-testid="public-trace-link"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#F28C28] hover:underline"
        >
          View Public Traceability Page <ExternalLink size={14} />
        </Link>
      )}

      {activeStage && <QRModal batchId={batch.batch_id} stage={activeStage} onClose={() => setActiveStage(null)} seedType={batch.seed_type} pin={batch.area_pin} />}
    </ProtectedLayout>
  );
}

const InfoCard = ({ label, value, accent, testid }) => (
  <div className={`rounded-2xl p-4 border ${accent ? "bg-[#F28C28]/10 border-[#F28C28]/30" : "bg-white border-[#D8E0D9]"}`} data-testid={testid}>
    <div className="text-xs uppercase tracking-wider text-[#56675B] font-semibold">{label}</div>
    <div className={`font-data text-lg font-semibold mt-1 ${accent ? "text-[#F28C28]" : "text-[#1A4331]"}`}>{value}</div>
  </div>
);

const TimelineStage = ({ stage, active, title, icon: Icon, date, details, last, onViewQR, actionLabel, onAction }) => (
  <div className="flex gap-4 relative" data-testid={`timeline-stage-${stage}`}>
    {!last && <div className="absolute left-[18px] top-10 bottom-0 w-0.5 bg-[#D8E0D9]" />}
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        active ? "bg-[#1A4331] text-white" : "bg-[#F3F5F1] text-[#56675B] border border-[#D8E0D9]"
      }`}
    >
      {active ? <CheckCircle2 size={18} /> : <Circle size={18} />}
    </div>
    <div className="flex-1 pb-6">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Icon size={16} className={active ? "text-[#4C8A53]" : "text-[#56675B]"} />
            <h4 className="font-semibold text-[#1A4331]">{title}</h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#F3F5F1] text-[#56675B] uppercase tracking-wider font-semibold">Stage {stage}</span>
          </div>
          {date && <div className="text-xs text-[#56675B] mt-0.5">{new Date(date).toLocaleString()}</div>}
        </div>
        <div className="flex gap-2">
          {active && onViewQR && (
            <button onClick={onViewQR} data-testid={`stage-${stage}-view-qr`} className="text-xs px-3 py-1.5 rounded-lg bg-[#F3F5F1] text-[#1A4331] hover:bg-[#D8E0D9] font-medium">
              View QR
            </button>
          )}
          {actionLabel && onAction && (
            <button onClick={onAction} data-testid={`stage-${stage}-action`} className="text-xs px-3 py-1.5 rounded-lg bg-[#F28C28] text-white hover:bg-[#D97B20] font-medium">
              {actionLabel}
            </button>
          )}
        </div>
      </div>
      {active && details?.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {details.map((d) => (
            <div key={d.label} className="text-xs bg-[#F3F5F1] rounded-lg px-3 py-2">
              <span className="text-[#56675B] uppercase tracking-wider font-semibold">{d.label}: </span>
              <span className="font-semibold text-[#1A4331]">{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const QRModal = ({ batchId, stage, onClose, seedType, pin }) => {
  const [qrBlobUrl, setQrBlobUrl] = useState(null);
  const [loading, setLoading] = useState(stage !== 3);

  // Stage 3 = customer-facing bottle QR. Rendered client-side so it always encodes
  // the exact public URL visible in the browser (no server-side guessing).
  const publicTraceUrl = stage === 3 ? `${window.location.origin}/trace/${batchId}` : null;

  useEffect(() => {
    if (stage === 3) return; // client-rendered, no API call needed
    setLoading(true);
    (async () => {
      try {
        const res = await api.get(`/batches/${batchId}/qr/${stage}`, { responseType: "blob" });
        setQrBlobUrl(URL.createObjectURL(res.data));
      } catch (e) {
        toast.error("Failed to load QR");
      } finally {
        setLoading(false);
      }
    })();
    return () => qrBlobUrl && URL.revokeObjectURL(qrBlobUrl);
    // eslint-disable-next-line
  }, [batchId, stage]);

  const stageLabels = { 1: "Bag Label (Procurement)", 2: "Oil Container (Extraction)", 3: "Customer Bottle (Packaging)" };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 no-print" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()} data-testid="qr-modal">
        <div className="print-area">
          <div className="p-6 text-center border-b border-[#D8E0D9]">
            <img src={LOGO_URL} alt="Simply Bhartiya" className="w-20 h-20 mx-auto object-contain" style={{ clipPath: "inset(8% 10% 18% 10%)" }} />
            <div className="font-serif text-2xl font-bold text-[#1A4331] -mt-2">Simply Bhartiya</div>
            <div className="text-xs uppercase tracking-widest text-[#56675B] font-medium">Stage {stage} — {stageLabels[stage]}</div>
          </div>
          <div className="p-6 flex flex-col items-center">
            {stage === 3 ? (
              <div className="p-3 bg-white" data-testid="qr-image">
                <QRCodeCanvas
                  value={publicTraceUrl}
                  size={256}
                  level="H"
                  includeMargin={false}
                  fgColor="#1A4331"
                />
              </div>
            ) : loading ? (
              <Loader2 className="animate-spin text-[#4C8A53]" size={40} />
            ) : (
              <img src={qrBlobUrl} alt="QR" className="w-64 h-64" data-testid="qr-image" />
            )}
            <div className="mt-4 text-center">
              <div className="text-xs uppercase tracking-wider text-[#56675B] font-semibold">Batch ID</div>
              <div className="font-data text-sm font-bold text-[#1A4331] break-all">{batchId}</div>
              <div className="text-xs text-[#56675B] mt-1">{seedType} · PIN {pin}</div>
              {stage === 3 && (
                <div className="mt-3 pt-3 border-t border-dashed border-[#D8E0D9]">
                  <div className="text-[10px] uppercase tracking-widest text-[#56675B] font-semibold mb-1">Scan opens</div>
                  <div className="font-data text-[11px] text-[#4C8A53] break-all">{publicTraceUrl}</div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 bg-[#F3F5F1] flex gap-2 justify-end no-print">
          <button onClick={onClose} data-testid="qr-close" className="px-4 py-2 rounded-lg text-sm font-medium text-[#1A4331] hover:bg-white">Close</button>
          <button onClick={() => window.print()} data-testid="qr-print" className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1A4331] text-white hover:bg-[#245A42] flex items-center gap-2">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>
    </div>
  );
};
