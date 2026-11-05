import { currentSession, requireViewer, AuthError } from "@/lib/auth/session";
import { authJson } from "@/lib/auth/http";
import { revenueReport, reportFailure } from "@/lib/reports/revenue";
import { revenueCsv } from "@/lib/reports/csv";
export async function GET(request: Request) {
  try {
    await requireViewer(["ADMIN", "STAFF"]);
    const session = await currentSession();
    if (!session) throw new AuthError("UNAUTHENTICATED", 401);
    const q = new URL(request.url).searchParams;
    const report = await revenueReport(session.id, {
      from: q.get("from") ?? "",
      to: q.get("to") ?? "",
      bucket: q.get("bucket") ?? "",
      movie: q.get("movie") ?? "",
      cinema: q.get("cinema") ?? "",
    });
    if (q.get("format") === "csv")
      return new Response(
        revenueCsv(report, q.get("locale") === "en" ? "en" : "vi"),
        {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Cache-Control": "private, no-store",
            Vary: "Cookie",
            "Content-Disposition": `attachment; filename="cinereserve-revenue-${report.from}-${report.to}.csv"`,
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    return authJson(report);
  } catch (error) {
    return reportFailure(error);
  }
}
