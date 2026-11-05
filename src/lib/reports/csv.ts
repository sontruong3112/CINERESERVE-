import type { RevenueReport, RevenueRow } from "./shared";
function quote(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
function text(value: string) {
  return quote(/^[\s]*[=+\-@\t\r\n]/.test(value) ? `'${value}` : value);
}
export function revenueCsv(report: RevenueReport, locale: "vi" | "en") {
  const vi = locale === "vi";
  const header = vi
    ? [
        "Nhóm",
        "Nội dung",
        "Từ ngày",
        "Đến ngày",
        "Tiền thu VND",
        "Tiền hoàn VND",
        "Sau hoàn VND",
        "Đơn đã thu",
        "Đơn đã hoàn",
        "Ghế đã bán",
        "Ghế đã hoàn",
      ]
    : [
        "Group",
        "Label",
        "From",
        "To",
        "Gross VND",
        "Refund VND",
        "Net VND",
        "Paid orders",
        "Refunded orders",
        "Sold seats",
        "Refunded seats",
      ];
  const row = (group: string, item: RevenueRow) =>
    [
      text(group),
      text(locale === "vi" ? item.label : item.labelEn),
      quote(report.from),
      quote(report.to),
      ...[
        item.gross,
        item.refunds,
        item.net,
        item.paidOrders,
        item.refundedOrders,
        item.soldSeats,
        item.refundedSeats,
      ].map(quote),
    ].join(",");
  return (
    "\uFEFF" +
    [
      header.map(quote).join(","),
      row(vi ? "Tổng" : "Total", {
        key: "",
        label: vi ? "Thanh toán giả lập" : "Simulated payments",
        labelEn: "Simulated payments",
        ...report.summary,
      }),
      ...report.time.map((r) => row(vi ? "Thời gian" : "Time", r)),
      ...report.movies.map((r) => row(vi ? "Phim" : "Movie", r)),
      ...report.cinemas.map((r) => row(vi ? "Chi nhánh" : "Cinema", r)),
    ].join("\r\n") +
    "\r\n"
  );
}
