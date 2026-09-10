import type { CapacitorConfig } from "@capacitor/cli";

// This turns the already-built web app (frontend/dist) into a real installable
// Android app — no app-store account, no cloud build service required, just
// Android Studio (free) running locally. See README section "Mobile app
// without Render or Atlas" for the full walkthrough.
const config: CapacitorConfig = {
  appId: "com.easytalk.app",
  appName: "Easy Talk",
  webDir: "dist",
  server: {
    // Capacitor apps are bundled, static files with NO server of their own —
    // unlike a browser tab, there's no "same origin" to fall back to. Set
    // VITE_API_URL (frontend/.env) to your self-hosted backend's public
    // address before running `npm run cap:sync` so the bundled app knows
    // where to send requests.
    androidScheme: "https",
  },
};

export default config;
