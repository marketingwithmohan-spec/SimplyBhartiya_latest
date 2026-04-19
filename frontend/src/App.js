import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import BatchesPage from "./pages/BatchesPage";
import ProcurementPage from "./pages/ProcurementPage";
import BatchDetailPage from "./pages/BatchDetailPage";
import Stage2Page from "./pages/Stage2Page";
import Stage3Page from "./pages/Stage3Page";
import ScanPage from "./pages/ScanPage";
import PublicTracePage from "./pages/PublicTracePage";

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/dashboard" : "/batches"} replace />;
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/batches" element={<BatchesPage />} />
            <Route path="/procurement" element={<ProcurementPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/batch/:batchId" element={<BatchDetailPage />} />
            <Route path="/batch/:batchId/stage2" element={<Stage2Page />} />
            <Route path="/batch/:batchId/stage3" element={<Stage3Page />} />
            <Route path="/trace/:batchId" element={<PublicTracePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
