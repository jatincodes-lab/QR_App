import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://qrave.app"),
  title: {
    default: "Qrave | QR Menu Ordering Software",
    template: "%s"
  },
  description: "Qrave is QR menu ordering and customer CRM software for restaurants, cafes, cloud kitchens, and food service teams.",
  applicationName: "Qrave",
  authors: [{ name: "Qrave" }],
  creator: "Qrave",
  publisher: "Qrave",
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
