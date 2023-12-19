import { ubuntu } from "./ui/fonts";
import "./ui/global.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${ubuntu.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
