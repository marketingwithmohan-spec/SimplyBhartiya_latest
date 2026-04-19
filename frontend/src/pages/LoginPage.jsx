import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Lock, User } from "lucide-react";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_bhartiya-trace/artifacts/ny91w2mk_Simply%20Bhartiya%20logo%20Sticker.png";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={user.role === "admin" ? "/dashboard" : "/batches"} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(username.trim(), password);
      toast.success(`Welcome, ${u.username}!`);
      navigate(u.role === "admin" ? "/dashboard" : "/batches");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] bg-paisley flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-up">
        <div className="bg-white rounded-2xl card-elevate p-8 heritage-border">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-24 h-24 mb-3 overflow-hidden flex items-center justify-center">
              <img src={LOGO_URL} alt="Simply Bhartiya" className="w-32 h-32 object-contain" style={{ clipPath: "inset(8% 10% 18% 10%)" }} />
            </div>
            <h1 className="font-serif text-4xl font-bold text-[#1A4331] leading-tight">Simply Bhartiya</h1>
            <p className="text-xs uppercase tracking-[0.2em] text-[#56675B] mt-1 font-medium">Inventory & Traceability</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#56675B] mb-1.5">Username</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#56675B]" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Admin or Staff"
                  data-testid="login-username-input"
                  required
                  className="w-full border border-[#D8E0D9] rounded-lg p-3 pl-10 text-[#121F17] focus:ring-2 focus:ring-[#4C8A53] focus:border-transparent outline-none bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#56675B] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#56675B]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  data-testid="login-password-input"
                  required
                  className="w-full border border-[#D8E0D9] rounded-lg p-3 pl-10 text-[#121F17] focus:ring-2 focus:ring-[#4C8A53] focus:border-transparent outline-none bg-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full bg-[#1A4331] text-white hover:bg-[#245A42] disabled:opacity-60 transition-colors shadow-sm rounded-xl px-6 py-3 font-medium flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              Sign in
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[#56675B]">
            Cold-pressed with care. Traced with transparency.
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-[#56675B]">
          © {new Date().getFullYear()} Simply Bhartiya · Bharat ki shuddhata
        </div>
      </div>
    </div>
  );
}
