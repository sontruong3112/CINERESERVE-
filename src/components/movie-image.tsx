"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./cinema-ui.module.css";

export function MovieImage({ src, alt, title, priority = false, className }: { src: string; alt: string; title: string; priority?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div role="img" aria-label={alt} className={`${styles.imageFallback} ${className ?? ""}`}>{title}</div>;
  return <Image src={src} alt={alt} fill unoptimized sizes="(max-width: 600px) 45vw, (max-width: 1000px) 30vw, 280px" priority={priority} className={className ?? styles.posterImage} onError={() => setFailed(true)} />;
}
