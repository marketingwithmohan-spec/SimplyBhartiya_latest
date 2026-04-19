import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, LayoutDashboard, Package, ScanLine, Plus } from "lucide-react";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_bhartiya-trace/artifacts/ny91w2mk_Simply%20Bhartiya%20logo%20Sticker.png";

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
    { to: "/batches", label: "Batches", icon: Package, roles: ["admin", "staff"] },
    { to: "/scan", label: "Scan", icon: ScanLine, roles: ["admin", "staff"] },
    { to: "/procurement", label: "New Batch", icon: Plus, roles: ["admin"] },
  ];
  const visibleNav = navItems.filter((n) => n.roles.includes(user?.role));

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#D8E0D9] no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <Link to={user?.role === "admin" ? "/dashboard" : "/batches"} className="flex items-center gap-3" data-testid="header-brand-link">
          <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-[#F3F5F1]">
            <img src={LOGO_URL} alt="Simply Bhartiya" className="w-14 h-14 object-contain scale-125" style={{ clipPath: "inset(8% 10% 18% 10%)" }} />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-xl sm:text-2xl font-bold text-[#1A4331]">Simply Bhartiya</div>
            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-[#56675B] font-medium">Traceability System</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {visibleNav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  active ? "bg-[#1A4331] text-white" : "text-[#1A4331] hover:bg-[#F3F5F1]"
                }`}
              >
                <Icon size={16} /> {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-[#1A4331]" data-testid="header-username">{user?.username}</div>
            <div className="text-[10px] uppercase tracking-widest text-[#56675B]">{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="header-logout-button"
            className="flex items-center gap-1 p-2 sm:px-3 sm:py-2 rounded-xl text-sm font-medium border border-[#D8E0D9] text-[#1A4331] hover:bg-[#F3F5F1]"
          >
            <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden border-t border-[#D8E0D9] bg-white flex justify-around">
        {visibleNav.map((item) => {
          const active = location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              data-testid={`mobile-nav-${item.label.toLowerCase().replace(" ", "-")}`}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 flex-1 text-[11px] font-medium ${
                active ? "text-[#1A4331]" : "text-[#56675B]"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
};
