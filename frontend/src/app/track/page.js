"use client";

import { useState } from "react";
import { ArrowRight, ClipboardList, Mail, MapPin, MessageCircle, PackageSearch, Phone, Search, Sun, Moon } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./search.module.css";

export default function TrackSearchPage() {
  const router = useRouter();
  const [tag, setTag] = useState("");
  const [message, setMessage] = useState("");
  const [darkMode, setDarkMode] = useState(true);

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
        <div className={styles.headerLeft}>
          <span>ติดตามสถานะการผลิต</span>
        </div>
        <div className={styles.brand}>
          <img src="/logo-wordmark.png" alt="Naive Innova" className={styles.logo} />
        </div>
        <div className={styles.headerRight}>
          <button className={styles.themeBtn} onClick={() => setDarkMode(!darkMode)} title={darkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}>
            {darkMode ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
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
            <p className={styles.companyDesc}>OEM Pet Care &amp; Animal Health บนเทคโนโลยีนาโนและสารสกัดธรรมชาติ<br />Spin-off จากคณะสัตวแพทย์ จุฬาฯ</p>
            <div className={styles.contactRows}>
              <a href="tel:0877149262" className={styles.contactRow}><span className={`${styles.contactIcon} ${styles.contactOdd}`}><Phone size={14} /></span><span>087-714-9262 · 094-888-1184</span></a>
              <a href="mailto:info@naiveinnova.com" className={styles.contactRow}><span className={`${styles.contactIcon} ${styles.contactEven}`}><Mail size={14} /></span><span>info@naiveinnova.com</span></a>
              <span className={styles.contactRow}><span className={`${styles.contactIcon} ${styles.contactOdd}`}><MessageCircle size={14} /></span><span>LINE: @naivepetcare</span></span>
              <span className={styles.contactRow}><span className={`${styles.contactIcon} ${styles.contactEven}`}><MapPin size={14} /></span><span>144/1 ต.สายเหนือ อ.พาน จ.เชียงราย 57120</span></span>
            </div>
          </div>
          <div className={styles.footerCol}>
            <b className={styles.colTitle}>บริการ</b>
            <a href="https://www.naivepetcare.com/branding/steps">รับผลิต OEM</a>
            <a href="https://www.naivepetcare.com/branding/innovation">Custom Formula</a>
            <a href="https://www.naivepetcare.com/branding/steps">Brand Building</a>
            <a href="https://www.naivepetcare.com/contact/faq">Regulatory Support</a>
          </div>
          <div className={styles.footerCol}>
            <b className={styles.colTitle}>ข้อมูล</b>
            <a href="https://www.naivepetcare.com/branding/innovation">เกี่ยวกับเรา</a>
            <a href="https://www.naivepetcare.com/branding/innovation">นวัตกรรม &amp; สารสกัด</a>
            <a href="https://www.naivepetcare.com/news/activities-new">บทความ &amp; สื่อ</a>
            <a href="https://www.naivepetcare.com/news/videos">วิดีโอ</a>
          </div>
          <div className={styles.footerCol}>
            <b className={styles.colTitle}>ช่วยเหลือ</b>
            <a href="https://www.naivepetcare.com/content">นัดหมายสร้างแบรนด์</a>
            <a href="https://www.naivepetcare.com/contact/faq">คำถามที่พบบ่อย</a>
            <a href="https://www.naivepetcare.com/content">แผนที่โรงงาน</a>
            <a href="https://www.naivepetcare.com/news/videos">Factory Tour</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <small className={styles.copyright}>© 2026 NAIVE INNOVA CO., LTD. · ALL RIGHTS RESERVED · นวัตกรรมสัตว์เลี้ยง</small>
        </div>
      </footer>
    </main>
  );
}
