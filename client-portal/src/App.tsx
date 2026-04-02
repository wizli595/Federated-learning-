import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Register  from "./pages/Register";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 4000,
          style: {
            background: "#18181b",
            color: "#f4f4f5",
            border: "1px solid #3f3f46",
            borderRadius: "12px",
            fontSize: "13px",
            padding: "12px 16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          },
          success: {
            iconTheme: { primary: "#34d399", secondary: "#18181b" },
          },
          error: {
            iconTheme: { primary: "#f87171", secondary: "#18181b" },
          },
        }}
      />
      <Routes>
        <Route path="/"                      element={<Register />} />
        <Route path="/register"              element={<Register />} />
        <Route path="/dashboard/:clientId"   element={<Dashboard />} />
        <Route path="*"                      element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
