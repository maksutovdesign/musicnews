import type { Metadata } from "next";
import { appPath } from "@/lib/paths";
import "./globals.css";

export const metadata: Metadata = {
  title: "MusicNews — global music news by country & genre",
  description:
    "Aggregated music news from official outlets, sortable by country, genre and source.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container">
            <a className="brand" href={appPath("/")} aria-label="MusicNews home">
              <img src={appPath("/musicnews.png")} alt="" />
              <span className="brand-text">Music<strong>News</strong></span>
            </a>
            <nav className="top-nav" aria-label="Primary">
              <a href={appPath("/")}>News</a>
              <a href={appPath("/releases")}>Releases</a>
              <a href={appPath("/artists")}>Artists</a>
              <a href={appPath("/admin/sources")}>Sources</a>
              <a href={appPath("/admin/review")}>Review</a>
            </nav>
            <div className="tagline">global music news · by country &amp; genre</div>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
