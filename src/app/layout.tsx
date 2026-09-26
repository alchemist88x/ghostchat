import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalPopupProvider } from "@/components/ui/GlobalPopupProvider";
import { InstallPwaPrompt } from "@/components/ui/InstallPwaPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GhostChat — Anonymous Ephemeral Messaging | Talk Privately",
  description:
    "Create a temporary private GhostChat room, share the link, and start messaging without creating an account. Conversations vanish after 3 days.",
  applicationName: "GhostChat",
  authors: [{ name: "GhostChat Team" }],
  keywords: ["GhostChat", "anonymous chat", "temporary messaging", "private chat", "ephemeral chat", "disposable chat"],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GhostChat",
  },
  openGraph: {
    title: "GhostChat — Direct Ephemeral Messaging",
    description: "Create a temporary private GhostChat conversation, share the link, and start talking — no account required.",
    type: "website",
    siteName: "GhostChat",
  },
  twitter: {
    card: "summary_large_image",
    title: "GhostChat — Anonymous Ephemeral Messaging",
    description: "Create a temporary private GhostChat conversation, share the link, and start talking — no account required.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#090d16" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('ghostchat-theme');
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col bg-background text-foreground selection:bg-indigo-500/30 selection:text-indigo-200`}
      >
        <GlobalPopupProvider>
          <InstallPwaPrompt />
          {children}
        </GlobalPopupProvider>
      </body>
    </html>
  );
}
