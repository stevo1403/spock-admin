import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // Import QueryClient things
import { router } from "./routes";
import "./index.css";

// Create a client
const queryClient = new QueryClient();

// Ensure the root element exists
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

// Use React 19 createRoot API
const root = ReactDOM.createRoot(rootElement);

// Render the app, wrapping RouterProvider with QueryClientProvider
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {/* TODO: Add ReactQueryDevtools for debugging */}
    </QueryClientProvider>
  </React.StrictMode>
);
