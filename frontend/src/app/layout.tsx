import type { Metadata } from "next";
import "./styles.css";
import SidebarWrapper from "../components/SidebarWrapper";

export const metadata: Metadata = {
  title: "OmniSync Emlak",
  description: "Instagram comment automation for real estate teams"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <SidebarWrapper>{children}</SidebarWrapper>
      </body>
    </html>
  );
}
