/** Calendar dates are cinema-local (Vietnam), independent of the browser timezone. */
export function validDay(value: string): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "2000-01-01" ||
    value > "9999-12-31"
  )
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function searchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

export type ScheduleOption = { movie: string; cinema: string; day: string };

export function scheduleDays(
  options: ScheduleOption[],
  movie?: string,
  cinema?: string,
) {
  return [
    ...new Set(
      options
        .filter(
          (option) =>
            (!movie || option.movie === movie) &&
            (!cinema || option.cinema === cinema),
        )
        .map((option) => option.day),
    ),
  ].sort();
}

export function bookingQuery(cinema?: string, day?: string) {
  const query = new URLSearchParams();
  if (cinema) query.set("cinema", cinema);
  if (day) query.set("date", day);
  return query.size ? `?${query}` : "";
}
