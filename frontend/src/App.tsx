import React from "react";
import { Outlet } from "@tanstack/react-router";
import "./App.css"; // Keep or modify base styles as needed

// Basic layout component
const App: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      {/* Basic Navigation (can be improved later) */}
      <nav className="mb-6 pb-2 border-b">
        <a href="/" className="text-blue-600 hover:underline mr-4">
          Campaigns
        </a>
        {/* Add other global navigation links if needed */}
      </nav>

      {/* Render the matched route component */}
      <main>
        <Outlet />
      </main>

      {/* Footer or other global elements */}
      <footer className="mt-8 pt-4 border-t text-center text-gray-500 text-sm">
        Spock Admin
      </footer>
    </div>
  );
};

export default App;
