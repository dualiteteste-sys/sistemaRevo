import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// ⚠️ Importa a tela especial de confirmação de auth
import AuthConfirmed from "@/pages/auth/Confirmed";

// Se seu projeto usa Tailwind/CSS global, mantenha os imports existentes
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./contexts/ToastProvider";
import { AuthProvider } from "./contexts/AuthProvider";

/**
 * Bootstrap condicional:
 * - Se a URL iniciar com /auth/confirmed, montamos o AuthConfirmed "sozinho"
 *   para processar o hash do Supabase sem depender do router.
 * - Caso contrário, renderizamos o App normalmente.
 */
const root = document.getElementById("root")!;

if (window.location.pathname.startsWith("/auth/confirmed")) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <AuthConfirmed />
    </React.StrictMode>
  );
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}
