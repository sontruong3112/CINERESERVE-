import type { ReactNode } from "react";

// Locale layouts own <html lang> so each language is rendered correctly on the server.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
