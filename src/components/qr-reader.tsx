"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import jsQR from "jsqr";
import type { Locale } from "@/lib/i18n";
import styles from "./ticket-scanner.module.css";
export function QrReader({
  locale,
  disabled,
  onRead,
  onStart,
}: {
  locale: Locale;
  disabled: boolean;
  onRead: (code: string) => void;
  onStart: () => void;
}) {
  const vi = locale === "vi",
    video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    frame = useRef(0),
    generation = useRef(0);
  const [running, setRunning] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const release = useCallback(() => {
    generation.current++;
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);
  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState === "hidden") {
        release();
        setRunning(false);
        setLoading(false);
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      release();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [release]);
  async function start() {
    onStart();
    release();
    const ownGeneration = generation.current;
    setLoading(true);
    setError("");
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
        throw new Error("UNSUPPORTED");
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 960 } },
        audio: false,
      });
      if (ownGeneration !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      if (!video.current) {
        release();
        return;
      }
      video.current.srcObject = media;
      await video.current.play();
      if (ownGeneration !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      setRunning(true);
      const canvas = document.createElement("canvas"),
        context = canvas.getContext("2d", { willReadFrequently: true });
      let last = 0;
      const tick = (timestamp: number) => {
        if (ownGeneration !== generation.current) return;
        const element = video.current;
        if (
          context &&
          element &&
          element.readyState >= 2 &&
          element.videoWidth &&
          timestamp - last >= 250
        ) {
          last = timestamp;
          const scale = Math.min(1, 960 / element.videoWidth);
          canvas.width = Math.round(element.videoWidth * scale);
          canvas.height = Math.round(element.videoHeight * scale);
          context.drawImage(element, 0, 0, canvas.width, canvas.height);
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          const decoded = jsQR(image.data, image.width, image.height, {
            inversionAttempts: "attemptBoth",
          });
          if (decoded) {
            release();
            setRunning(false);
            onRead(decoded.data);
            return;
          }
        }
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    } catch {
      release();
      setRunning(false);
      setError(
        vi
          ? "Không mở được camera. Cho phép camera trên localhost/HTTPS hoặc dùng nhập mã, chọn ảnh QR bên dưới."
          : "Camera unavailable. Allow access on localhost/HTTPS, or enter the code / choose a QR image below.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function file(event: ChangeEvent<HTMLInputElement>) {
    const image = event.target.files?.[0];
    event.target.value = "";
    if (!image) return;
    onStart();
    release();
    setRunning(false);
    setError("");
    setLoading(true);
    try {
      if (
        image.size > 5 * 1024 * 1024 ||
        !["image/png", "image/jpeg", "image/webp"].includes(image.type)
      )
        throw new Error();
      const bitmap = await createImageBitmap(image);
      try {
        const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height)),
          canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error();
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height),
          decoded = jsQR(pixels.data, pixels.width, pixels.height, {
            inversionAttempts: "attemptBoth",
          });
        if (!decoded) throw new Error();
        onRead(decoded.data);
      } finally {
        bitmap.close();
      }
    } catch {
      setError(
        vi
          ? "Không đọc được QR trong ảnh. Dùng PNG/JPEG/WebP tối đa 5 MB, chụp rõ một mã hoặc nhập mã thủ công."
          : "Unable to read QR. Use a clear PNG/JPEG/WebP image up to 5 MB, with one QR code, or enter the code manually.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className={styles.reader}>
      <div className={styles.actions}>
        <button
          type="button"
          className="button buttonOutline"
          disabled={disabled || loading}
          onClick={() => {
            if (running) {
              release();
              setRunning(false);
            } else void start();
          }}
        >
          {loading
            ? vi
              ? "Đang mở…"
              : "Opening…"
            : running
              ? vi
                ? "Tắt camera"
                : "Stop camera"
              : vi
                ? "Bật camera quét QR"
                : "Scan QR with camera"}
        </button>
        <label className={styles.file}>
          {vi ? "Đọc QR từ ảnh" : "Read QR image"}
          <input
            aria-label={vi ? "Chọn ảnh QR" : "Choose QR image"}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={disabled || loading || running}
            onChange={(e) => void file(e)}
          />
        </label>
      </div>
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        hidden={!running}
        className={styles.video}
      />
      <p className={styles.muted}>
        {vi
          ? "Camera và ảnh được xử lý ngay trong trình duyệt; chỉ mã vé được gửi để tra cứu. Đọc mã chưa đánh dấu vé đã dùng."
          : "Camera frames and images stay in your browser; only the decoded ticket code is sent for lookup. Reading a code does not redeem it."}
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
