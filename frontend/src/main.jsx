import { ClerkProvider } from "@clerk/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      localization={{
        signUp: {
          start: {
            subtitle: "Welcome to Disaster Grid! Please fill in the details to get started.",
          },
        },
      }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>
);
