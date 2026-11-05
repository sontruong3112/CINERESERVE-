import { AuthError, requireViewer } from "@/lib/auth/session";
import { authJson, authFailure } from "@/lib/auth/http";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const viewer = await requireViewer(["STAFF"]);
    const cinema = viewer.cinema!;
    const requested = new URL(request.url).searchParams.get("cinema");
    if (requested && requested !== cinema.code)
      throw new AuthError("FORBIDDEN", 403);
    const sessions = await getDb().showtime.findMany({
      where: {
        auditorium: { cinemaId: cinema.id, active: true },
        startsAt: { gte: new Date() },
        status: "ON_SALE",
      },
      select: {
        id: true,
        startsAt: true,
        auditorium: { select: { name: true } },
        movie: { select: { originalTitle: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 20,
    });
    return authJson({ cinema, sessions });
  } catch (error) {
    return authFailure(error);
  }
}
