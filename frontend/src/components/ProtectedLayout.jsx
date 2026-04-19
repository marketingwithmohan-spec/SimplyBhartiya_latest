import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Header } from "./Header";

export const ProtectedLayout = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/batches" replace />;
  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">{children}</main>
    </div>
  );
};
