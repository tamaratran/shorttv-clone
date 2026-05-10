import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CoinProvider } from "@/context/CoinContext";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ShortMax - Watch Trending Short Dramas Online",
  description:
    "Discover and watch the best short-form dramas. Romance, fantasy, thriller, and more. New episodes daily.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} h-full antialiased`}
    >
      <body className={`${montserrat.className} min-h-full flex flex-col bg-[#141516] text-white`}>
        <CoinProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </CoinProvider>
      </body>
    </html>
  );
}
