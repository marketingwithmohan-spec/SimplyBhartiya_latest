import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProtectedLayout } from "../components/ProtectedLayout";
import { Html5Qrcode } from "html5-qrcode";
import api from "../lib/api";
import { toast } from "sonner";
import { ScanLine, Camera, StopCircle, Keyboard } from "lucide-react";

export default function ScanPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [manualId, setManualId] = useState("");
  const scannerRef = useRef(null);
  const elementIdRef = useRef("qr-reader");

  useEffect(() => {
    return () => {
      // cleanup
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => scannerRef.current = null);
      }
    };
  }, []);

  const parseAndRoute = async (decoded) => {
    // Accept formats: "SB|<batchId>|S<stage>", full URL with /trace/<id>, or plain batch_id
    let batchId = decoded.trim();
    if (batchId.startsWith("SB|")) {
      const parts = batchId.split("|");
      batchId = parts[1];
    } else if (batchId.includes("/trace/")) {
      batchId = batchId.split("/trace/")[1].split(/[?#]/)[0];
    }
    if (!batchId) {
      toast.error("Could not read QR");
      return;
    }
    try {
      const { data } = await api.get(`/batches/${batchId}`);
      // Route by current stage
      if (data.stage === 1) navigate(`/batch/${batchId}/stage2`);
      else if (data.stage === 2) navigate(`/batch/${batchId}/stage3`);
      else navigate(`/batch/${batchId}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Batch not found");
    }
  };

  const startScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const html5QrCode = new Html5Qrcode(elementIdRef.current);
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decoded) => {
          await html5QrCode.stop();
          scannerRef.current = null;
          setScanning(false);
          parseAndRoute(decoded);
        },
        () => {}
      );
    } catch (err) {
      setScanning(false);
      toast.error("Camera access denied or unavailable");
    }
  };

  const stopScan = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const manualSubmit = (e) => {
    e.preventDefault();
    if (manualId.trim()) parseAndRoute(manualId);
  };

  return (
    <ProtectedLayout>
      <div className="max-w-xl mx-auto">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#F28C28] font-semibold mb-2">
            <ScanLine size={14} /> QR Scanner
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#1A4331] tracking-tight">Scan Batch QR</h1>
          <p className="text-[#56675B] mt-1 text-sm">Point your camera at a batch QR to continue production</p>
        </div>

        <div className="bg-white border border-[#D8E0D9] rounded-2xl p-6 card-elevate">
          <div id={elementIdRef.current} className="min-h-[250px] bg-[#F3F5F1] rounded-xl flex items-center justify-center" data-testid="qr-reader-container">
            {!scanning && (
              <div className="text-center p-8">
                <Camera className="mx-auto text-[#4C8A53] mb-2" size={48} />
                <p className="text-sm text-[#56675B]">Camera preview will appear here</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2 justify-center">
            {!scanning ? (
              <button
                onClick={startScan}
                data-testid="scan-start-button"
                className="flex-1 bg-[#1A4331] text-white hover:bg-[#245A42] rounded-xl px-6 py-3 font-medium flex items-center justify-center gap-2"
              >
                <Camera size={18} /> Start Camera
              </button>
            ) : (
              <button
                onClick={stopScan}
                data-testid="scan-stop-button"
                className="flex-1 bg-[#EF4444] text-white hover:bg-[#DC2626] rounded-xl px-6 py-3 font-medium flex items-center justify-center gap-2"
              >
                <StopCircle size={18} /> Stop
              </button>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#56675B] font-semibold mb-2">
            <Keyboard size={14} /> Or enter manually
          </div>
          <form onSubmit={manualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="e.g. BM20260215143022-110001"
              data-testid="scan-manual-input"
              className="flex-1 border border-[#D8E0D9] rounded-lg p-3 bg-white focus:ring-2 focus:ring-[#4C8A53] outline-none"
            />
            <button
              type="submit"
              data-testid="scan-manual-submit"
              className="bg-[#F28C28] text-white hover:bg-[#D97B20] rounded-xl px-5 py-3 font-medium"
            >
              Go
            </button>
          </form>
        </div>
      </div>
    </ProtectedLayout>
  );
}
