"use client";

import { useState } from "react";
import { ArrowRight, ClipboardList, Mail, MapPin, MessageCircle, PackageSearch, Phone, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./search.module.css";

export default function TrackSearchPage() {
  const router = useRouter();
  const [tag, setTag] = useState("");
  const [message, setMessage] = useState("");

  function submit(event) {
    event.preventDefault();
    const value = tag.trim();
    if (!value) {
      setMessage("กรุณากรอกเลขที่แท็ก หรือเลขที่งานก่อนค้นหา");
      return;
    }
    setMessage("");
    router.push(`/track/${encodeURIComponent(value.toUpperCase())}`);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <img src="/logo-wordmark.png" alt="Naive Innova" className={styles.logo} />
        <span>ติดตามสถานะการผลิต</span>
      </header>

      <section className={styles.hero} aria-labelledby="track-title">
        <div className={styles.iconWrap}><PackageSearch size={31} strokeWidth={1.7} /></div>
        <p className={styles.eyebrow}>NAIVE INNOVA · ORDER TRACKING</p>
        <h1 id="track-title">ค้นหาสถานะคำสั่งซื้อ</h1>
        <p className={styles.intro}>กรอกเลขที่แท็ก หรือเลขที่งาน เพื่อติดตามความคืบหน้าการผลิตและจัดส่งสินค้า</p>

        <form className={styles.searchForm} onSubmit={submit} noValidate>
          <label htmlFor="tracking-tag">เลขที่แท็ก / เลขที่งาน</label>
          <div className={styles.searchRow}>
            <Search size={21} aria-hidden="true" />
            <input
              id="tracking-tag"
              value={tag}
              onChange={(event) => { setTag(event.target.value); setMessage(""); }}
              placeholder="ตัวอย่าง TG-20250001 หรือ JOB-2568-0042"
              autoComplete="off"
            />
            <button type="submit">ค้นหา <ArrowRight size={18} /></button>
          </div>
          {message && <p className={styles.error} role="alert">{message}</p>}
        </form>

        <div className={styles.helper}>
          <ClipboardList size={19} />
          <span>เลขที่แท็กจะอยู่ในเอกสารยืนยันคำสั่งซื้อ หรือสอบถามได้จากทีมดูแลลูกค้า</span>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.company}>
            <img src="/logo-wordmark.png" alt="Naive Innova" />
            <strong>Naive Innova</strong>
            <span>OEM Pet Care &amp; Animal Health</span>
            <span>บนเทคโนโลยีนาโนและสารสกัดธรรมชาติ</span>
            <span>Spin-off จากคณะสัตวแพทย์ จุฬาฯ</span>
          </div>
          <div className={styles.contact}>
            <b>ติดต่อเรา</b>
            <a href="tel:0877149262"><Phone /> 087-714-9262</a>
            <a href="tel:0948881184"><Phone /> 094-888-1184</a>
            <a href="mailto:info@naiveinnova.com"><Mail /> info@naiveinnova.com</a>
            <span><MessageCircle /> LINE: @naivepetcare</span>
          </div>
          <div className={styles.address}>
            <b>ที่อยู่</b>
            <span><MapPin /> 144/1 ต.สายเหนือ อ.พาน<br />&nbsp;&nbsp;&nbsp;&nbsp;จ.เชียงราย 57120</span>
            <b className={styles.serviceTitle}>บริการ</b>
            <a href="/track">ติดตามออเดอร์</a><span>สถานะการผลิต</span><span>คลังสินค้า</span>
          </div>
        </div>
        <div className={styles.footerBottom}><small>© 2568 Naive Innova Co., Ltd. สงวนสิทธิ์ทุกประการ</small><small><i /> ระบบทำงานปกติ</small></div>
      </footer>
    </main>
  );
}
