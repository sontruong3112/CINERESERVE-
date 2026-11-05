import QRCode from "qrcode";
import { currentSession, requireViewer, AuthError } from "@/lib/auth/session";
import { holdFailure } from "@/lib/booking/service";
import { ownTicketQr } from "@/lib/tickets/service";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireViewer();
    const session = await currentSession();
    if (!session) throw new AuthError("UNAUTHENTICATED", 401);
    const ticket = await ownTicketQr(session.id, (await params).id);
    const svg = await QRCode.toString(ticket.payload, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 4,
      width: 260,
    });
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        ...(new URL(request.url).searchParams.get("download") === "1"
          ? {
              "Content-Disposition": `attachment; filename="${ticket.code}.svg"`,
            }
          : {}),
      },
    });
  } catch (error) {
    return holdFailure(error);
  }
}
