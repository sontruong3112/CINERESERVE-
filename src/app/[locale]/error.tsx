"use client";
import { useParams } from "next/navigation";

export default function CatalogueError({ reset }: { reset: () => void }) {
  const { locale } = useParams();
  const vi = locale !== "en";
  return <section className="container" style={{paddingBlock:80}} role="alert"><h1>{vi ? "Chưa tải được dữ liệu" : "Unable to load the catalogue"}</h1><p>{vi ? "Hãy kiểm tra PostgreSQL đang chạy rồi thử lại. Hệ thống không tự thay dữ liệu database bằng dữ liệu giả." : "Check that PostgreSQL is running, then retry. Database errors are not silently replaced with demo data."}</p><button className="button buttonGold" onClick={reset}>{vi ? "Thử lại" : "Retry"}</button></section>;
}
