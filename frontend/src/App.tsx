import React from "react";
import { Outlet } from "@tanstack/react-router";
import { ToastProvider } from "./components/ToastProvider";
import "./App.css";
import "./styles/theme.css";

const App: React.FC = () => {
  return (
    <ToastProvider>
      <div className="theme-gradient-bg">
        <div className="container mx-auto p-4">
          <nav className="mb-6 pb-2 border-b">
            <a href="/" className="text-blue-600 hover:underline mr-4">
              Campaigns
            </a>
          </nav>
          <main>
            <Outlet />
          </main>
          <footer className="mt-8 pt-4 border-t text-center text-gray-500 text-sm">
            Spock Admin
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
};

export default App;
