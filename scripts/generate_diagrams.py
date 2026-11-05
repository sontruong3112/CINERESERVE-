# -*- coding: utf-8 -*-
"""
Script tao toan bo hinh anh bieu do cho Chuong 1 va Chuong 2 cua Bao cao Do an CineReserve
Chat luong cao, mau sac chuyen nghiep, phu hop chen vao Word
"""

import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

out_dir = r"d:\DA\docs-images"
os.makedirs(out_dir, exist_ok=True)

plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['axes.edgecolor'] = '#333333'

def save_fig(fig, filename):
    path = os.path.join(out_dir, filename)
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"Created: {filename}")

# -------------------------------------------------------------
# HÌNH 1.3: Doanh thu thị trường phòng vé qua các năm
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(7, 4.2), facecolor='#12151C')
ax.set_facecolor('#181C24')
years = ['2020', '2021', '2022', '2023', '2024', '2025*']
rev = [12.0, 21.3, 26.0, 33.9, 39.5, 43.2]
online_rev = [4.1, 8.5, 13.8, 22.5, 29.2, 35.6]
x = np.arange(len(years))
w = 0.35

b1 = ax.bar(x - w/2, rev, w, label='Tổng doanh thu phòng vé ($B)', color='#2B6CB0', edgecolor='#4299E1', linewidth=1.2)
b2 = ax.bar(x + w/2, online_rev, w, label='Doanh thu bán vé trực tuyến ($B)', color='#DD6B20', edgecolor='#F6AD55', linewidth=1.2)

ax.set_title('TĂNG TRƯỞNG DOANH THU ĐIỆN ẢNH VÀ ĐẶT VÉ TRỰC TUYẾN TOÀN CẦU', color='#E2E8F0', fontsize=11, fontweight='bold', pad=12)
ax.set_ylabel('Tỷ đô la Mỹ ($ Billions)', color='#CBD5E0', fontsize=10)
ax.set_xticks(x)
ax.set_xticklabels(years, color='#E2E8F0', fontsize=10)
ax.tick_params(colors='#CBD5E0')
ax.grid(axis='y', linestyle='--', alpha=0.25, color='#A0AEC0')
ax.legend(facecolor='#1A202C', edgecolor='#4A5568', labelcolor='#EDF2F7', fontsize=9)
save_fig(fig, 'hinh1-3-doanh-thu-dien-anh.png')

# -------------------------------------------------------------
# HÌNH 1.4: Tỷ lệ các kênh phân phối vé xem phim
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(7, 4.2), facecolor='#12151C')
ax.set_facecolor('#181C24')
channels = ['Ứng dụng di động & Web trực tuyến', 'Tại quầy bán vé truyền thống', 'Máy bán vé tự động Kiosk', 'Đại lý / Nền tảng đối tác khác']
shares = [74.5, 15.2, 7.3, 3.0]
colors = ['#3182CE', '#D69E2E', '#38A169', '#E53E3E']
wedges, texts, autotexts = ax.pie(shares, labels=channels, autopct='%1.1f%%', startangle=140, 
                                  colors=colors, textprops=dict(color='#E2E8F0', fontsize=9),
                                  wedgeprops=dict(edgecolor='#1A202C', linewidth=2))
for at in autotexts:
    at.set_color('#FFFFFF')
    at.set_fontweight('bold')
ax.set_title('TỶ LỆ CÁC KÊNH PHÂN PHỐI VÉ XEM PHIM NĂM 2025', color='#E2E8F0', fontsize=11, fontweight='bold', pad=12)
save_fig(fig, 'hinh1-4-ti-le-kenh-phan-phoi.png')

# -------------------------------------------------------------
# HÌNH 1.6 - 1.8: Mô hình Client - Server
# -------------------------------------------------------------
def make_diagram(title, filename, nodes, edges):
    fig, ax = plt.subplots(figsize=(7.5, 3.8), facecolor='#12151C')
    ax.set_facecolor('#181C24')
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6)
    ax.axis('off')
    
    for n in nodes:
        rect = patches.FancyBboxPatch((n['x'], n['y']), n['w'], n['h'],
                                      boxstyle="round,pad=0.2",
                                      facecolor=n.get('color', '#2B6CB0'),
                                      edgecolor=n.get('border', '#63B3ED'),
                                      linewidth=1.5)
        ax.add_patch(rect)
        ax.text(n['x'] + n['w']/2, n['y'] + n['h']/2, n['text'],
                color='#FFFFFF', fontsize=9.5, fontweight='bold', ha='center', va='center', wrap=True)
        
    for e in edges:
        ax.annotate('', xy=e['to'], xytext=e['from'],
                    arrowprops=dict(arrowstyle="->", color=e.get('color', '#ED8936'), lw=2, mutation_scale=15))
        if 'label' in e:
            ax.text(e['lx'], e['ly'], e['label'], color=e.get('tcolor', '#CBD5E0'), fontsize=8.5, ha='center', va='center',
                    bbox=dict(boxstyle='square,pad=0.15', facecolor='#1A202C', edgecolor='none', alpha=0.85))
            
    ax.set_title(title, color='#E2E8F0', fontsize=11, fontweight='bold', pad=10)
    save_fig(fig, filename)

make_diagram('MÔ HÌNH KIẾN TRÚC CLIENT - SERVER TRONG PHÁT TRIỂN WEB', 'hinh1-6-client-server.png',
    [
        {'x': 0.8, 'y': 1.8, 'w': 2.5, 'h': 2.4, 'text': 'CLIENT\n(Web Browser / Mobile)\n- Trình diễn giao diện\n- Bắt sự kiện người dùng', 'color': '#2C5282', 'border': '#63B3ED'},
        {'x': 6.7, 'y': 1.8, 'w': 2.5, 'h': 2.4, 'text': 'SERVER\n(Node.js / Next.js)\n- Xử lý nghiệp vụ\n- Kết nối Cơ sở dữ liệu', 'color': '#744210', 'border': '#F6AD55'}
    ],
    [
        {'from': (3.5, 3.5), 'to': (6.5, 3.5), 'label': 'HTTP Request (GET, POST...)', 'lx': 5.0, 'ly': 3.9},
        {'from': (6.5, 2.5), 'to': (3.5, 2.5), 'label': 'HTTP Response (HTML, JSON)', 'lx': 5.0, 'ly': 2.1, 'color': '#48BB78'}
    ])

make_diagram('SO SÁNH MÔ HÌNH SSR (NEXT.JS) VÀ CLIENT-SIDE RENDERING (CSR)', 'hinh1-9-ssr-vs-csr.png',
    [
        {'x': 0.8, 'y': 3.2, 'w': 3.8, 'h': 2.0, 'text': 'SSR (Server-Side Rendering)\nServer nạp DB -> Render HTML hoàn chỉnh\n-> Trình duyệt mở ra xem được ngay (Nhanh, SEO tốt)', 'color': '#22543D', 'border': '#68D391'},
        {'x': 5.4, 'y': 3.2, 'w': 3.8, 'h': 2.0, 'text': 'CSR (Client-Side Rendering)\nServer gửi HTML trống + JS nặng\n-> Trình duyệt tải JS rồi mới vẽ trang (Chậm, SEO kém)', 'color': '#742A2A', 'border': '#FC8181'},
        {'x': 2.0, 'y': 0.6, 'w': 6.0, 'h': 1.8, 'text': 'NEXT.JS APP ROUTER (CINERESERVE)\nKết hợp Server Components (RSC) mặc định cho trang và dữ liệu\nChỉ bật Client Components ("use client") cho các khối tương tác (Ghế, QR, Chat)', 'color': '#2C5282', 'border': '#63B3ED'}
    ],
    [
        {'from': (5.0, 2.4), 'to': (5.0, 3.0), 'color': '#ECC94B'}
    ])

make_diagram('CƠ CHẾ KHÓA POSTGRESQL ADVISORY LOCK TRONG XỬ LÝ TRANSACTIONS', 'hinh1-16-advisory-lock.png',
    [
        {'x': 0.6, 'y': 1.5, 'w': 2.4, 'h': 2.8, 'text': 'CLIENT A\nYêu cầu giữ ghế A1\n\nBEGIN TRANSACTION\npg_advisory_xact_lock\n-> ĐƯỢC CẤP KHÓA\n-> Giữ ghế thành công\nCOMMIT -> Tự nhả Lock', 'color': '#234E52', 'border': '#4FD1C5'},
        {'x': 7.0, 'y': 1.5, 'w': 2.4, 'h': 2.8, 'text': 'CLIENT B\nYêu cầu giữ ghế A1\n\nBEGIN TRANSACTION\npg_advisory_xact_lock\n-> PHẢI CHỜ...\n-> Nhận Lock: Đã có người giữ\n-> ROLLBACK (Lỗi 409)', 'color': '#742A2A', 'border': '#FC8181'},
        {'x': 3.5, 'y': 1.8, 'w': 3.0, 'h': 2.2, 'text': 'POSTGRESQL 17\nAdvisory Lock (20261102)\n\nTuần tự hóa giao dịch\nKhông bao giờ Deadlock\nTự động giải phóng khi đóng Transaction', 'color': '#4A5568', 'border': '#A0AEC0'}
    ],
    [
        {'from': (3.0, 3.3), 'to': (3.5, 3.3), 'label': 'Lock Granted', 'lx': 3.25, 'ly': 3.6, 'color': '#48BB78'},
        {'from': (7.0, 2.5), 'to': (6.5, 2.5), 'label': 'Waiting in Queue', 'lx': 6.75, 'ly': 2.8, 'color': '#ECC94B'}
    ])

# -------------------------------------------------------------
# HÌNH 2.1: Biểu đồ Use Case Tổng quát (Vẽ chuẩn UML)
# -------------------------------------------------------------
def make_usecase_diagram(title, filename, actors, usecases, links):
    fig, ax = plt.subplots(figsize=(8.5, 5.2), facecolor='#12151C')
    ax.set_facecolor('#181C24')
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 10)
    ax.axis('off')
    
    # Boundary box
    box = patches.FancyBboxPatch((2.6, 0.4), 6.8, 9.0, boxstyle="round,pad=0.2",
                                facecolor='#1A202C', edgecolor='#4A5568', linewidth=1.5, linestyle='--')
    ax.add_patch(box)
    ax.text(6.0, 9.1, 'Hệ thống CineReserve', color='#E2E8F0', fontsize=11, fontweight='bold', ha='center')
    
    # Draw Actors
    for a in actors:
        x, y = a['x'], a['y']
        # Head
        circle = plt.Circle((x, y + 0.45), 0.22, color='#ECC94B', ec='#D69E2E', lw=1.5)
        ax.add_patch(circle)
        # Body
        ax.plot([x, x], [y + 0.23, y - 0.25], color='#ECC94B', lw=2)
        # Arms
        ax.plot([x - 0.35, x + 0.35], [y + 0.05, y + 0.05], color='#ECC94B', lw=2)
        # Legs
        ax.plot([x, x - 0.3], [y - 0.25, y - 0.65], color='#ECC94B', lw=2)
        ax.plot([x, x + 0.3], [y - 0.25, y - 0.65], color='#ECC94B', lw=2)
        # Name
        ax.text(x, y - 0.95, a['name'], color='#ECC94B', fontsize=9.5, fontweight='bold', ha='center')
        
    # Draw Use cases (Ovals)
    for u in usecases:
        ellipse = patches.Ellipse((u['x'], u['y']), u['w'], u['h'],
                                  facecolor='#2B6CB0', edgecolor='#63B3ED', linewidth=1.5)
        ax.add_patch(ellipse)
        ax.text(u['x'], u['y'], u['name'], color='#FFFFFF', fontsize=8.5, fontweight='bold', ha='center', va='center')
        
    # Draw Links
    for l in links:
        ax.plot([l['from'][0], l['to'][0]], [l['from'][1], l['to'][1]], color='#A0AEC0', lw=1.2, linestyle=l.get('ls', '-'))
        if 'label' in l:
            mx = (l['from'][0] + l['to'][0]) / 2
            my = (l['from'][1] + l['to'][1]) / 2
            ax.text(mx, my, l['label'], color='#F6AD55', fontsize=7.5, ha='center', va='center',
                    bbox=dict(boxstyle='square,pad=0.1', facecolor='#1A202C', edgecolor='none'))

    ax.set_title(title, color='#E2E8F0', fontsize=12, fontweight='bold', pad=12)
    save_fig(fig, filename)

make_usecase_diagram('BIỂU ĐỒ USE CASE TỔNG QUÁT HỆ THỐNG CINERESERVE', 'hinh2-1-usecase-tong-quat.png',
    [
        {'x': 1.2, 'y': 6.0, 'name': 'Khách hàng\n(Customer)'},
        {'x': 10.8, 'y': 7.0, 'name': 'Quản trị viên\n(Admin)'},
        {'x': 10.8, 'y': 3.0, 'name': 'Nhân viên rạp\n(Staff)'}
    ],
    [
        {'x': 6.0, 'y': 8.2, 'w': 3.6, 'h': 0.8, 'name': 'Đăng ký / Đăng nhập / Đổi mật khẩu'},
        {'x': 4.5, 'y': 6.9, 'w': 3.2, 'h': 0.8, 'name': 'Xem phim & Đặt vé nhanh'},
        {'x': 4.5, 'y': 5.5, 'w': 3.2, 'h': 0.8, 'name': 'Chọn ghế & Giữ ghế 5 phút'},
        {'x': 4.5, 'y': 4.1, 'w': 3.2, 'h': 0.8, 'name': 'Thanh toán & Nhận vé QR'},
        {'x': 4.5, 'y': 2.7, 'w': 3.2, 'h': 0.8, 'name': 'Trò chuyện với Trợ lý AI'},
        {'x': 7.6, 'y': 6.9, 'w': 3.2, 'h': 0.8, 'name': 'Quản lý phim & Lịch chiếu'},
        {'x': 7.6, 'y': 5.5, 'w': 3.2, 'h': 0.8, 'name': 'Quản lý nhân viên & Gán rạp'},
        {'x': 7.6, 'y': 4.1, 'w': 3.2, 'h': 0.8, 'name': 'Báo cáo doanh thu đa chiều'},
        {'x': 7.6, 'y': 2.7, 'w': 3.2, 'h': 0.8, 'name': 'Soát vé QR bằng Camera'}
    ],
    [
        {'from': (1.4, 6.0), 'to': (4.2, 8.2)},
        {'from': (1.4, 6.0), 'to': (2.9, 6.9)},
        {'from': (1.4, 6.0), 'to': (2.9, 5.5)},
        {'from': (1.4, 6.0), 'to': (2.9, 4.1)},
        {'from': (1.4, 6.0), 'to': (2.9, 2.7)},
        {'from': (10.6, 7.0), 'to': (7.8, 8.2)},
        {'from': (10.6, 7.0), 'to': (9.2, 6.9)},
        {'from': (10.6, 7.0), 'to': (9.2, 5.5)},
        {'from': (10.6, 7.0), 'to': (9.2, 4.1)},
        {'from': (10.6, 3.0), 'to': (7.8, 8.2)},
        {'from': (10.6, 3.0), 'to': (9.2, 4.1)},
        {'from': (10.6, 3.0), 'to': (9.2, 2.7)}
    ])

# -------------------------------------------------------------
# BIỂU ĐỒ TRÌNH TỰ SEQUENCE DIAGRAM CHUẨN ĐẸP (Hình 2.5 -> 2.11)
# -------------------------------------------------------------
def make_sequence_diagram(title, filename, lifelines, messages):
    fig, ax = plt.subplots(figsize=(8.5, 5.5), facecolor='#12151C')
    ax.set_facecolor('#181C24')
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')
    
    n_ll = len(lifelines)
    xs = np.linspace(1.2, 8.8, n_ll)
    
    # Draw Lifeline Headers and Dashed Lines
    for i, name in enumerate(lifelines):
        x = xs[i]
        # Box
        rect = patches.FancyBboxPatch((x - 0.9, 8.8), 1.8, 0.8, boxstyle="round,pad=0.1",
                                      facecolor='#2B6CB0', edgecolor='#63B3ED', lw=1.2)
        ax.add_patch(rect)
        ax.text(x, 9.2, name, color='#FFFFFF', fontsize=8.5, fontweight='bold', ha='center', va='center')
        # Line
        ax.plot([x, x], [0.6, 8.8], color='#4A5568', linestyle='--', lw=1.2)
        
    # Draw Messages
    n_msg = len(messages)
    ys = np.linspace(8.0, 1.2, n_msg)
    
    for i, m in enumerate(messages):
        y = ys[i]
        from_idx = m['from']
        to_idx = m['to']
        x1 = xs[from_idx]
        x2 = xs[to_idx]
        
        is_return = m.get('return', False)
        ls = '--' if is_return else '-'
        col = '#48BB78' if is_return else '#ECC94B'
        
        if from_idx == to_idx:
            # Self call
            ax.annotate('', xy=(x1, y - 0.25), xytext=(x1, y),
                        arrowprops=dict(arrowstyle="->", color=col, lw=1.5))
            ax.plot([x1, x1 + 0.5, x1 + 0.5, x1], [y, y, y - 0.25, y - 0.25], color=col, lw=1.2)
            ax.text(x1 + 0.6, y - 0.12, m['text'], color='#E2E8F0', fontsize=8, va='center')
        else:
            ax.annotate('', xy=(x2, y), xytext=(x1, y),
                        arrowprops=dict(arrowstyle="->", color=col, lw=1.5, linestyle=ls))
            mx = (x1 + x2) / 2
            ax.text(mx, y + 0.15, m['text'], color='#E2E8F0', fontsize=8, ha='center', va='bottom',
                    bbox=dict(boxstyle='square,pad=0.1', facecolor='#181C24', edgecolor='none'))

    ax.set_title(title, color='#E2E8F0', fontsize=11, fontweight='bold', pad=12)
    save_fig(fig, filename)

make_sequence_diagram('BIỂU ĐỒ TRÌNH TỰ USE CASE CHỌN VÀ GIỮ GHẾ 5 PHÚT', 'hinh2-7-seq-giu-ghe.png',
    ['Khách hàng', 'SeatPicker UI', 'Showtime API', 'Database (Postgres)'],
    [
        {'from': 0, 'to': 1, 'text': '1. Bấm chọn ghế A1, A2 trên sơ đồ'},
        {'from': 1, 'to': 2, 'text': '2. PUT /api/showtimes/[id]/seats'},
        {'from': 2, 'to': 3, 'text': '3. BEGIN TRANSACTION'},
        {'from': 2, 'to': 3, 'text': '4. pg_advisory_xact_lock(20261102)'},
        {'from': 2, 'to': 3, 'text': '5. Quét giải phóng holds hết hạn (databaseNow)'},
        {'from': 2, 'to': 3, 'text': '6. Tạo HoldSession (hạn 5 phút) & gán ghế'},
        {'from': 3, 'to': 2, 'text': '7. COMMIT TRANSACTION (Tự nhả Lock)', 'return': True},
        {'from': 2, 'to': 1, 'text': '8. Trả về SeatMap mới & expiresAt', 'return': True},
        {'from': 1, 'to': 0, 'text': '9. Bắt đầu đếm ngược 300s & hiển thị nút Checkout'}
    ])

make_sequence_diagram('BIỂU ĐỒ TRÌNH TỰ USE CASE THANH TOÁN VÀ PHÁT HÀNH VÉ QR', 'hinh2-8-seq-thanh-toan.png',
    ['Khách hàng', 'OrderDetail UI', 'Payment API', 'Postgres DB'],
    [
        {'from': 0, 'to': 1, 'text': '1. Xác nhận độ tuổi & bấm Thanh toán'},
        {'from': 1, 'to': 2, 'text': '2. POST /orders/[id]/payments (idempotencyKey)'},
        {'from': 2, 'to': 3, 'text': '3. Kiểm tra HoldSession còn hạn & chưa thanh toán'},
        {'from': 2, 'to': 3, 'text': '4. Chuyển trạng thái ghế sang SOLD'},
        {'from': 2, 'to': 3, 'text': '5. Sinh vé TK-... & chuyển đơn sang PAID'},
        {'from': 3, 'to': 2, 'text': '6. Lưu vết PaymentAttempt thành công', 'return': True},
        {'from': 2, 'to': 1, 'text': '7. Trả về thông tin đơn hàng & mã vé', 'return': True},
        {'from': 1, 'to': 0, 'text': '8. Hiển thị vé điện tử kèm mã QR SVG'}
    ])

make_sequence_diagram('BIỂU ĐỒ TRÌNH TỰ USE CASE SOÁT VÉ QR TẠI CỬA RẠP', 'hinh2-9-seq-soat-ve.png',
    ['Nhân viên rạp', 'TicketScanner UI', 'Ticket API', 'Postgres DB'],
    [
        {'from': 0, 'to': 1, 'text': '1. Bật Web Camera quét mã QR vé'},
        {'from': 1, 'to': 2, 'text': '2. POST /staff/tickets/inspect (code)'},
        {'from': 2, 'to': 3, 'text': '3. Kiểm tra trạng thái vé & khung giờ chiếu'},
        {'from': 3, 'to': 2, 'text': '4. Trả về chi tiết vé (READY)', 'return': True},
        {'from': 2, 'to': 1, 'text': '5. Hiển thị thông tin phim, phòng, ghế', 'return': True},
        {'from': 0, 'to': 1, 'text': '6. Nhân viên bấm \"Xác nhận vào rạp\"'},
        {'from': 1, 'to': 2, 'text': '7. POST /staff/tickets/redeem (requestKey)'},
        {'from': 2, 'to': 3, 'text': '8. Chuyển vé -> USED & ghi TicketRedemption'},
        {'from': 3, 'to': 1, 'text': '9. Thông báo thành công (Check-in 1 lần duy nhất)', 'return': True}
    ])

make_sequence_diagram('BIỂU ĐỒ TRÌNH TỰ USE CASE TRÒ CHUYỆN VỚI TRỢ LÝ AI', 'hinh2-10-seq-chat-ai.png',
    ['Khách hàng', 'Chatbot Widget', 'Chat API (/api/chat)', 'Gemini AI', 'Postgres DB'],
    [
        {'from': 0, 'to': 1, 'text': '1. Nhập câu hỏi tự nhiên bằng tiếng Việt'},
        {'from': 1, 'to': 2, 'text': '2. POST /api/chat (Accept: ndjson)'},
        {'from': 2, 'to': 1, 'text': '3. Stream event: stage=\"understanding\"', 'return': True},
        {'from': 2, 'to': 3, 'text': '4. Gọi Gemini API (Single-Turn JSON Schema)'},
        {'from': 3, 'to': 2, 'text': '5. Trả về SearchPlan & câu phản hồi', 'return': True},
        {'from': 2, 'to': 1, 'text': '6. Stream event: stage=\"searching\"', 'return': True},
        {'from': 2, 'to': 4, 'text': '7. Truy vấn các suất chiếu đang mở bán'},
        {'from': 4, 'to': 2, 'text': '8. Trả về danh sách suất chiếu thực tế', 'return': True},
        {'from': 2, 'to': 1, 'text': '9. Stream event: reply (gợi ý thẻ phim & link đặt vé)', 'return': True}
    ])

print("DONE: Generated all charts and diagrams successfully!")
