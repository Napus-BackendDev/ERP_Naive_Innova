import "./globals.css";
import { Sarabun } from "next/font/google";
import GlobalLoadingBar from "@/components/ui/GlobalLoadingBar";

// Self-hosted via next/font (no external request, no layout shift). Sarabun
// covers Thai + Latin in one face, so the whole app finally renders the same
// on every machine — the old 'Inter' declaration was never actually loaded.
const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sarabun",
});

export const metadata = {
  title: "Naive Ops — Unified ERP Suite",
  description: "Modern, secure ERP dashboard for Naive Innova.",
};

// Responsive foundation — mobile browsers scale to device width, zoom allowed
// (never disable user-scalable — it's an accessibility failure).
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

// Runs before paint: apply .dark from the saved choice, or the OS theme when
// nothing is saved — otherwise every dark-mode page load flashes white (FOUC).
const themeInit = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning: the inline script mutates <html> class before
    // React hydrates, which is intentional.
    <html lang="th" className={`h-full ${sarabun.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {/* Covers every page (login, admin, kanban) — see components/ui/GlobalLoadingBar */}
        <GlobalLoadingBar />
        {children}
      </body>
    </html>
  );
}
