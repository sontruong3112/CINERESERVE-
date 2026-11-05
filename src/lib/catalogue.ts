import type { Locale } from "./i18n";

type Text = Record<Locale, string>;
export type Genre = "adventure" | "animation" | "drama" | "scifi";
export type Movie = {
  slug: string; title: Text; originalTitle: string; genre: Genre[]; duration: number;
  age: string; status: "now" | "soon"; year: number; director: string;
  synopsis: Text; poster: string; backdrop: string; accent: string;
};
const image = (file: string, size = "w500") => `https://image.tmdb.org/t/p/${size}/${file}`;
export const genreNames: Record<Genre, Text> = {
  adventure: { vi: "Phiêu lưu", en: "Adventure" }, animation: { vi: "Hoạt hình", en: "Animation" },
  drama: { vi: "Tâm lý", en: "Drama" }, scifi: { vi: "Khoa học viễn tưởng", en: "Sci-fi" },
};
export const movies: Movie[] = [
  {
    slug: "dune-part-two", title: { vi: "Dune: Hành tinh cát — Phần hai", en: "Dune: Part Two" }, originalTitle: "DUNE: PART TWO",
    genre: ["scifi", "adventure"], duration: 166, age: "T16", status: "now", year: 2024, director: "Denis Villeneuve",
    synopsis: { vi: "Paul Atreides đồng hành cùng Chani và người Fremen trên hành trình tìm lại công lý. Giữa tình yêu và vận mệnh, anh phải đối diện một lựa chọn có thể thay đổi tương lai của cả vũ trụ.", en: "Paul Atreides joins Chani and the Fremen on a journey of revenge and discovery. Caught between love and destiny, he must face a choice that could change the future of the universe." },
    poster: image("1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg"), backdrop: image("8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg", "w1280"), accent: "#b16e39",
  },
  {
    slug: "interstellar", title: { vi: "Hố đen tử thần", en: "Interstellar" }, originalTitle: "INTERSTELLAR",
    genre: ["scifi", "drama"], duration: 169, age: "T13", status: "now", year: 2014, director: "Christopher Nolan",
    synopsis: { vi: "Khi Trái Đất dần không còn là mái nhà, một nhóm phi hành gia bước qua giới hạn không gian để tìm tương lai cho nhân loại. Một hành trình về thời gian, hy vọng và tình yêu vượt mọi khoảng cách.", en: "As Earth becomes uninhabitable, a team of explorers travels beyond the limits of space to find humanity a future. A journey through time, hope, and a love that crosses every distance." },
    poster: image("gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"), backdrop: image("pbrkL804c8yAv3zBZR4QPEafpAR.jpg"), accent: "#426273",
  },
  {
    slug: "the-wild-robot", title: { vi: "Robot hoang dã", en: "The Wild Robot" }, originalTitle: "THE WILD ROBOT",
    genre: ["animation", "adventure"], duration: 102, age: "P", status: "now", year: 2024, director: "Chris Sanders",
    synopsis: { vi: "Mắc kẹt trên một hòn đảo hoang, robot Roz học cách kết nối với thế giới tự nhiên và trở thành người chăm sóc một chú ngỗng nhỏ. Câu chuyện ấm áp về tình thân và sự khác biệt.", en: "Stranded on an uninhabited island, Roz learns to connect with the natural world and care for an orphaned gosling. A warm story about belonging and unexpected family." },
    poster: image("wTnV3PCVW5O92JMrFvvrRcV39RU.jpg"), backdrop: image("v9acaWVVFdZT5yAU7J2QjwfhXyD.jpg"), accent: "#477568",
  },
  {
    slug: "spirited-away", title: { vi: "Vùng đất linh hồn", en: "Spirited Away" }, originalTitle: "SPIRITED AWAY",
    genre: ["animation", "adventure"], duration: 125, age: "P", status: "now", year: 2001, director: "Hayao Miyazaki",
    synopsis: { vi: "Chihiro lạc vào thế giới kỳ diệu nơi các linh hồn trú ngụ. Để cứu cha mẹ, cô bé tìm thấy lòng can đảm và những người bạn không ngờ tới.", en: "Chihiro enters a magical world of spirits. To save her parents, she discovers unexpected friendships and a courage she never knew she had." },
    poster: image("39wmItIWsg5sZMyRUHLkWBcuVCM.jpg"), backdrop: image("Ab8mkHmkYADjU7wqiOkia9BzGvS.jpg"), accent: "#548377",
  },
  {
    slug: "oppenheimer", title: { vi: "Oppenheimer", en: "Oppenheimer" }, originalTitle: "OPPENHEIMER",
    genre: ["drama"], duration: 180, age: "T18", status: "soon", year: 2023, director: "Christopher Nolan",
    synopsis: { vi: "Chân dung nhà vật lý J. Robert Oppenheimer và những lựa chọn làm thay đổi lịch sử. Một cuộc đối thoại đầy sức nặng giữa tham vọng khoa học và trách nhiệm con người.", en: "A portrait of physicist J. Robert Oppenheimer and the choices that changed history. A powerful exploration of scientific ambition and human responsibility." },
    poster: image("ptpr0kGAckfQkJeJIt8st5dglvd.jpg"), backdrop: image("fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg"), accent: "#8d4e2c",
  },
  {
    slug: "suzume", title: { vi: "Khóa chặt cửa nào Suzume", en: "Suzume" }, originalTitle: "SUZUME",
    genre: ["animation", "adventure"], duration: 122, age: "T13", status: "soon", year: 2022, director: "Makoto Shinkai",
    synopsis: { vi: "Một cánh cửa bí ẩn mở ra hành trình xuyên Nhật Bản. Suzume phải tìm cách khép lại những cánh cửa thảm họa, đồng thời đối diện ký ức của chính mình.", en: "A mysterious door begins a journey across Japan. Suzume must close the doors that bring disaster while finding a way to face her own memories." },
    poster: image("vIeu8WysZrTSFb2uhPViKjX9EcC.jpg"), backdrop: image("h8gHn0OzBoaefsYseUByqsmEDMY.jpg"), accent: "#487b9c",
  },
];

export const cinemas = [
  { code: "ha-noi", name: "CineReserve Hà Nội", area: { vi: "Hà Nội", en: "Hanoi" }, address: { vi: "Khu trung tâm Hà Nội · Địa điểm minh họa", en: "Central Hanoi · Illustrative location" }, rooms: 4 },
  { code: "bac-ninh", name: "CineReserve Bắc Ninh", area: { vi: "Bắc Ninh", en: "Bac Ninh" }, address: { vi: "Khu trung tâm Bắc Ninh · Địa điểm minh họa", en: "Central Bac Ninh · Illustrative location" }, rooms: 3 },
];

export function getDemoDays() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(`${today}T12:00:00+07:00`);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function formatDay(day: string, locale: Locale) {
  // Fixed labels avoid different ICU weekday abbreviations between Node and browsers.
  const date = new Date(`${day}T12:00:00+07:00`);
  const weekdays = locale === "vi"
    ? ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${weekdays[date.getUTCDay()]}, ${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

export function money(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-GB", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}
