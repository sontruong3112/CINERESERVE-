import Link from "next/link";
import "./globals.css";

export default function NotFound() {
  return <html lang="vi"><body><main className="container" style={{ minHeight: "90vh", display: "grid", alignContent: "center", justifyItems: "start", gap: 16 }}><p className="eyebrow">CINERESERVE · 404</p><h1>Trang này chưa có trong khung hình.</h1><p className="muted">This page could not be found.</p><Link className="button buttonGold" href="/vi">Về trang chủ / Back home →</Link></main></body></html>;
}
