import { useEffect, useState } from "react";
import { ProtectedLayout } from "../components/ProtectedLayout";
import api from "../lib/api";
import { toast } from "sonner";
import { Package, TrendingUp, Wheat, CheckCircle2, FileSpreadsheet, IndianRupee } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const PERIODS = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];
const SEED_COLORS = { "Black Mustard": "#1A4331", "White Sesame": "#F28C28", "Groundnut": "#D97B20", "Coconut": "#4C8A53", "Almond": "#8B5A2B" };

export default function DashboardPage() {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/analytics?period=${period}`);
        setData(data);
      } catch (e) {
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, [period]);

  const exportExcel = async () => {
    try {
      const res = await api.get("/export/excel", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `simply_bhartiya_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export started");
    } catch (e) {
      toast.error("Export failed");
    }
  };

  const seedPieData = data ? Object.entries(data.by_seed_type || {}).map(([name, value]) => ({ name, value })) : [];

  return (
    <ProtectedLayout adminOnly>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#1A4331] tracking-tight">Dashboard</h1>
          <p className="text-[#56675B] mt-1 text-sm">Overview of procurement, extraction and packaging</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-[#F3F5F1] rounded-xl p-1" data-testid="period-toggle">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                data-testid={`period-${p.key}`}
                onClick={() => setPeriod(p.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p.key ? "bg-[#1A4331] text-white" : "text-[#1A4331] hover:bg-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportExcel}
            data-testid="admin-export-excel"
            className="flex items-center gap-2 bg-[#F28C28] text-white hover:bg-[#D97B20] transition-colors shadow-sm rounded-xl px-4 py-2 font-medium text-sm"
          >
            <FileSpreadsheet size={16} /> Export Excel
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="text-center py-20 text-[#56675B]">Loading analytics…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Package} label="Total Batches" value={data?.total_batches ?? 0} color="#1A4331" testid="stat-total-batches" />
            <StatCard icon={Wheat} label="Quantity (kg)" value={(data?.total_quantity_kg ?? 0).toLocaleString()} color="#4C8A53" testid="stat-quantity" />
            <StatCard icon={IndianRupee} label="Total Revenue" value={`₹${(data?.total_revenue ?? 0).toLocaleString()}`} color="#F28C28" testid="stat-revenue" />
            <StatCard icon={CheckCircle2} label="Completed" value={data?.by_stage?.[3] ?? 0} color="#22C55E" testid="stat-completed" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white border border-[#D8E0D9] rounded-2xl p-6 card-elevate lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-2xl font-semibold text-[#1A4331]">Procurement Timeline</h3>
                <TrendingUp className="text-[#4C8A53]" size={20} />
              </div>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={data?.timeline || []}>
                    <XAxis dataKey="date" stroke="#56675B" fontSize={11} />
                    <YAxis stroke="#56675B" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #D8E0D9" }} />
                    <Bar dataKey="count" fill="#4C8A53" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-[#D8E0D9] rounded-2xl p-6 card-elevate">
              <h3 className="font-serif text-2xl font-semibold text-[#1A4331] mb-4">By Seed Type</h3>
              {seedPieData.length === 0 ? (
                <p className="text-sm text-[#56675B]">No data yet</p>
              ) : (
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={seedPieData} dataKey="value" nameKey="name" outerRadius={90} label>
                        {seedPieData.map((entry) => (
                          <Cell key={entry.name} fill={SEED_COLORS[entry.name] || "#4C8A53"} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#D8E0D9] rounded-2xl p-6 card-elevate">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-2xl font-semibold text-[#1A4331]">Stage Distribution</h3>
              <Link to="/batches" className="text-sm text-[#F28C28] hover:underline font-medium" data-testid="view-all-batches">View all batches →</Link>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <StageBlock label="Procurement" value={data?.by_stage?.[1] ?? 0} color="#F28C28" />
              <StageBlock label="Extraction" value={data?.by_stage?.[2] ?? 0} color="#4C8A53" />
              <StageBlock label="Packaged" value={data?.by_stage?.[3] ?? 0} color="#1A4331" />
            </div>
          </div>
        </>
      )}
    </ProtectedLayout>
  );
}

const StatCard = ({ icon: Icon, label, value, color, testid }) => (
  <div className="bg-white border border-[#D8E0D9] rounded-2xl p-5 card-elevate transition-all hover:shadow-md fade-up" data-testid={testid}>
    <div className="flex items-start justify-between mb-2">
      <div className="text-xs tracking-wider uppercase text-[#56675B] font-semibold">{label}</div>
      <Icon size={18} style={{ color }} />
    </div>
    <div className="font-data text-2xl sm:text-3xl font-bold text-[#1A4331]">{value}</div>
  </div>
);

const StageBlock = ({ label, value, color }) => (
  <div className="border-l-4 rounded-r-xl rounded-l-sm bg-[#F3F5F1] p-4" style={{ borderColor: color }}>
    <div className="text-xs uppercase tracking-wider text-[#56675B] font-semibold">{label}</div>
    <div className="font-data text-3xl font-bold mt-1" style={{ color }}>{value}</div>
  </div>
);
