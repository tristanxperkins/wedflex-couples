import "./globals.css";
import type { Metadata } from "next";
import Nav from "./components/Nav";
import localFont from "next/font/local"

const satoshi = localFont({
  src: [
    {
      path: "./fonts/Satoshi-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-Bold.woff2",
      weight: "700",
      style: "normal",
},
  ],
  variable: "--font-satoshi",
});

export const metadata: Metadata = {
  title: "WedFlex",
  description: "Make Money off of Weddings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={satoshi.variable}>
      {/* brand base colors */}
      <body className="bg-white text-brand-charcoal font-sans">
        {/* Single, sticky, white nav row */}
<header className="sticky top-0 z-50 bg-white/90 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <Nav />
          </div>
        </header>

        <main className="min-h-screen">
          {children}
        </main>

         <footer className="mt-12 bg-brand-primary text-white">
          <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-left">
              <span className="font-bold text-lg">WedFlex</span>
              <span className="opacity-90">
                For Marriage and Community.
              </span>
            </div>
            <span className="opacity-80 text-xs md:text-sm text-right">
              © {2025} WedFlex. 
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
