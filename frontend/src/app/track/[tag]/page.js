"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, ChevronRight, ClipboardList, FileImage, PackageCheck, X, Phone, Mail, MessageCircle, MapPin, Sun, Moon
} from "lucide-react";
import styles from "./tracking.module.css";

const photos = {
  packaging: "https://images.unsplash.com/photo-1631730359585-38a4935cbec4?w=900&h=500&fit=crop&auto=format",
  qc: "https://images.unsplash.com/photo-1614935151651-0bea6508db6b?w=900&h=500&fit=crop&auto=format",
  bottle: "https://images.unsplash.com/photo-1631390179406-0bfe17e9f89d?w=900&h=500&fit=crop&auto=format",
  label: "https://images.unsplash.com/photo-1605718317361-f9326fd262ca?w=900&h=500&fit=crop&auto=format",
  lot: "https://images.unsplash.com/photo-1602052577122-f73b9710adba?w=900&h=500&fit=crop&auto=format",
  finish: "https://images.unsplash.com/photo-1670201203208-055d6d79db4a?w=900&h=500&fit=crop&auto=format",
};

const descriptions = {
  "ออเดอร์": "รับคำสั่งซื้อจากลูกค้าและตรวจสอบความถูกต้องของรายละเอียดออเดอร์ทั้งหมด ได้แก่ ชนิดสินค้า จำนวน ข้อกำหนดพิเศษ และวันที่ต้องการรับสินค้า ก่อนยืนยันเข้าสู่ระบบ",
  "ลิ้งค์แท็ค": "เชื่อมลิ้งค์แท็คเข้ากับระบบติดตามสินค้า ลงทะเบียนหมายเลขแท็คแต่ละชิ้นให้ตรงกับ LOT การผลิต และตั้งค่าพารามิเตอร์การติดตามสถานะตามชนิดสินค้าที่สั่งซื้อ",
  "บรรจุภัณฑ์ / สินค้า": "ตรวจสอบและจัดเตรียมวัสดุบรรจุภัณฑ์ให้ครบถ้วนตามสเปคที่ลูกค้ากำหนด รวมถึงตรวจนับจำนวนสินค้าคงคลัง และตรวจสอบคุณภาพบรรจุภัณฑ์ก่อนเข้าสู่กระบวนการผลิต",
  "ปรับสูตร": "ปรับสูตรการผลิตให้ตรงตามความต้องการเฉพาะของลูกค้า เช่น ปรับส่วนผสม ความเข้มข้น กลิ่น หรือคุณสมบัติพิเศษ และบันทึกสูตรที่ได้รับการอนุมัติลงในระบบ",
  "ผลิต": "เริ่มกระบวนการผลิตตามสูตรที่ได้รับการอนุมัติ ควบคุมกระบวนการให้ได้มาตรฐาน และตรวจสอบคุณภาพระหว่างการผลิตอย่างต่อเนื่อง",
  "ผลิตตามสูตร": "เริ่มกระบวนการผลิตตามสูตรมาตรฐานที่ได้รับการอนุมัติ ควบคุมกระบวนการให้ได้มาตรฐาน และตรวจสอบคุณภาพระหว่างการผลิตอย่างต่อเนื่อง",
  "R&D QC – ตรวจสอบคุณภาพจาก R&D": "ทีม R&D ตรวจสอบคุณภาพผลิตภัณฑ์ตามมาตรฐานที่กำหนด ครอบคลุมคุณสมบัติทางกายภาพ ทางเคมี และทางจุลชีววิทยา ก่อนส่งต่อฝ่าย Production",
  "Production ถ่ายรูปประกอบบรรจุภัณฑ์ขวด": "บันทึกภาพถ่ายขั้นตอนการบรรจุสินค้าลงขวด แสดงความถูกต้องของปริมาณและกระบวนการบรรจุ ใช้เป็นหลักฐานยืนยันมาตรฐานการผลิตส่งมอบให้ลูกค้า",
  "Production ถ่ายรูปติดสติกเกอร์": "บันทึกภาพถ่ายการติดฉลากสติกเกอร์บนผลิตภัณฑ์ ตรวจสอบความถูกต้องของข้อมูลบนฉลาก ได้แก่ ชื่อสินค้า ส่วนประกอบ และวันหมดอายุ",
  "Production ถ่ายรูปยิง LOT": "บันทึกภาพถ่ายการพิมพ์หมายเลข LOT และวันผลิต/หมดอายุลงบนผลิตภัณฑ์ เพื่อการตรวจสอบย้อนกลับและยืนยันว่าสินค้าทุกชิ้นมีหมายเลขที่ถูกต้อง",
  "Production ถ่ายรูป Finish Product": "บันทึกภาพถ่ายผลิตภัณฑ์สำเร็จรูปที่พร้อมจัดส่ง แสดงสภาพภายนอกและการบรรจุหีบห่อที่สมบูรณ์ ใช้เป็นหลักฐานยืนยันคุณภาพก่อนออกจากโรงงาน",
  "นำสินค้าส่งทางไปรษณีย์": "จัดเตรียมเอกสารการจัดส่ง บันทึกภาพถ่ายสินค้าก่อนส่งมอบ นำสินค้าส่งผ่านไปรษณีย์หรือบริษัทขนส่งที่กำหนด พร้อมแจ้งหมายเลขพัสดุให้ลูกค้าทราบ",
};

const statusStyle = {
  "รอเตรียมผลิต": "ready", "กำลังผลิต": "making", "รอบรรจุ": "packing",
  "รอ QC": "qc", "พร้อมส่ง": "ready", "ส่งมอบสำเร็จ": "delivered",
};
const flowStyle = { "ปรับสูตร": "adjust", "ผลิตตามสูตร": "standard", "พัฒนาสูตร": "develop" };

function makeSteps(labels, statuses) {
  return labels.map((label, index) => ({ label, ...statuses[index], desc: descriptions[label] }));
}

const products = [
  {
    id: "p1", name: "ฉลาก Tag อลูมิเนียมพรีเมียม 50×50mm", type: "ปรับสูตร", quantity: "1,200 ชิ้น", job: "JOB-2568-0042", updated: "15 ก.พ. 2568", estimate: "18 ก.พ. 2568", status: "รอบรรจุ", sub: "บรรจุภัณฑ์", prefix: "BS",
    steps: makeSteps(["ออเดอร์", "ลิ้งค์แท็ค", "บรรจุภัณฑ์ / สินค้า", "ปรับสูตร", "ผลิต", "R&D QC – ตรวจสอบคุณภาพจาก R&D", "Production ถ่ายรูปประกอบบรรจุภัณฑ์ขวด", "Production ถ่ายรูปติดสติกเกอร์", "Production ถ่ายรูปยิง LOT", "Production ถ่ายรูป Finish Product", "นำสินค้าส่งทางไปรษณีย์"], [
      { status: "done", date: "6 ก.พ. 09:00 น." }, { status: "done", date: "6 ก.พ. 09:00 น." }, { status: "done", date: "10 ก.พ. 09:00 น.", photo: photos.packaging }, { status: "done", date: "10 ก.พ. 09:00 น." }, { status: "done", date: "10 ก.พ. 09:00 น." }, { status: "done", date: "13 ก.พ. 09:00 น.", photo: photos.qc }, { status: "done", date: "15 ก.พ. 08:30 น.", photo: photos.bottle }, { status: "active", date: "15 ก.พ. 14:00 น.", photo: photos.label }, { status: "pending", photo: photos.lot }, { status: "pending", photo: photos.finish }, { status: "pending", tracking: true },
    ]),
  },
  {
    id: "p2", name: "น็อตยึดฉลากสแตนเลส M4", type: "ผลิตตามสูตร", quantity: "2,400 ชิ้น", job: "JOB-2568-0043", updated: "10 ก.พ. 2568", estimate: "20 ก.พ. 2568", status: "กำลังผลิต", sub: "กำลังผสม", prefix: "SH",
    steps: makeSteps(["ออเดอร์", "ลิ้งค์แท็ค", "บรรจุภัณฑ์ / สินค้า", "ผลิตตามสูตร", "R&D QC – ตรวจสอบคุณภาพจาก R&D", "Production ถ่ายรูปประกอบบรรจุภัณฑ์ขวด", "Production ถ่ายรูปติดสติกเกอร์", "Production ถ่ายรูปยิง LOT", "Production ถ่ายรูป Finish Product", "นำสินค้าส่งทางไปรษณีย์"], [
      { status: "done", date: "6 ก.พ. 09:00 น." }, { status: "done", date: "6 ก.พ. 09:00 น." }, { status: "done", date: "8 ก.พ. 10:00 น.", photo: photos.packaging }, { status: "active", date: "10 ก.พ. 09:00 น." }, { status: "pending", photo: photos.qc }, { status: "pending", photo: photos.bottle }, { status: "pending", photo: photos.label }, { status: "pending", photo: photos.lot }, { status: "pending", photo: photos.finish }, { status: "pending", tracking: true },
    ]),
  },
  {
    id: "p3", name: "คู่มือประกอบการติดตั้งฉลากและวิธีใช้", type: "พัฒนาสูตร", quantity: "5 เล่ม", job: "JOB-2568-0044", updated: "15 ก.พ. 2568", estimate: "15 ก.พ. 2568", status: "ส่งมอบสำเร็จ", sub: "จัดส่งแล้ว",
    steps: makeSteps(["ออเดอร์", "ลิ้งค์แท็ค", "ปรับสูตร", "R&D QC – ตรวจสอบคุณภาพจาก R&D", "Production ถ่ายรูป Finish Product", "นำสินค้าส่งทางไปรษณีย์"], [
      { status: "done", date: "6 ก.พ. 09:00 น." }, { status: "done", date: "6 ก.พ. 09:00 น." }, { status: "done", date: "10 ก.พ. 09:00 น." }, { status: "done", date: "13 ก.พ. 09:00 น.", photo: photos.qc }, { status: "done", date: "15 ก.พ. 08:00 น.", photo: photos.finish }, { status: "done", date: "15 ก.พ. 09:00 น.", tracking: true },
    ]),
  },
];

function Dot({ status }) {
  return <span className={`${styles.dot} ${styles[status]}`}>{status === "done" && <Check size={9} strokeWidth={3} />}{status === "active" && <i />}</span>;
}

function PhotoSlot({ photo, active }) {
  const ref = useRef(null); const [image, setImage] = useState(null); const [visible, setVisible] = useState(true);
  const shown = image || (visible && photo);
  if (!shown) return <button className={`${styles.uploadEmpty} ${!active ? styles.disabled : ""}`} disabled={!active} onClick={() => ref.current?.click()}><FileImage size={23} /><span>{active ? "อัปโหลดรูปหลักฐาน" : "รอดำเนินการ"}</span></button>;
  return <div className={styles.photo}><img src={shown} alt="หลักฐาน" /><span className={styles.sample}>{image ? "✓ รูปจริง" : "ตัวอย่าง"}</span><div className={styles.photoActions}>{active && <button onClick={() => ref.current?.click()}>แทนที่ด้วยรูปจริง</button>}<button onClick={() => { setImage(null); setVisible(false); }}>ลบ</button></div><input ref={ref} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && setImage(URL.createObjectURL(e.target.files[0]))} /></div>;
}

function Tracking({ active }) {
  const [value, setValue] = useState("");
  return <div className={styles.tracking}><label>หมายเลขพัสดุ / Tracking No.</label><div><input disabled={!active} value={value} onChange={(e) => setValue(e.target.value)} placeholder={active ? "กรอกหมายเลขพัสดุ เช่น EY123456789TH" : "รอดำเนินการ"} />{value && <button onClick={() => setValue("")}><X size={15} /></button>}</div>{value && <small>✓ บันทึกหมายเลขพัสดุแล้ว</small>}</div>;
}

function Timeline({ steps }) {
  return <div className={styles.timeline}>{steps.map((step, index) => <div className={styles.step} key={step.label}><div className={styles.rail}><Dot status={step.status} />{index < steps.length - 1 && <span className={`${styles.line} ${step.status === "done" ? styles.lineDone : ""}`} />}</div><div className={styles.stepBody}><div className={styles.stepTop}><div><h4>{step.label}</h4><p>{step.desc}</p></div><time>{step.date || "รอดำเนินการ"}</time></div><em className={styles[`state${step.status}`]}>{step.status === "done" ? "ดำเนินการเสร็จสิ้น" : step.status === "active" ? "กำลังดำเนินการ" : "รอดำเนินการ"}</em>{step.photo && <PhotoSlot photo={step.photo} active={step.status !== "pending"} />} {step.tracking && <Tracking active={step.status !== "pending"} />}</div></div>)}</div>;
}

function ProductCard({ product, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen); const done = product.steps.filter((s) => s.status === "done").length; const percent = Math.round(done / product.steps.length * 100);
  return <article className={styles.product}><button className={styles.productHead} onClick={() => setOpen(!open)}><div className={styles.productTitle}><ChevronRight className={open ? styles.openChevron : ""} size={19} /><div><h3>{product.name}</h3><span className={`${styles.flow} ${styles[flowStyle[product.type]]}`}>{product.type}</span><span className={styles.quantity}>{product.quantity}</span></div></div><div className={styles.statusWrap}><span className={`${styles.status} ${styles[statusStyle[product.status]]}`}>{product.status}</span><small>{product.sub}</small></div></button>{open && <div className={styles.productContent}><div className={styles.infoGrid}><Info label="ชื่อสินค้า" value={product.name} /><Info label="จำนวน" value={product.quantity} /><Info label="เลขที่งาน" value={product.job} /><Info label="วันที่ปรับปรุง" value={product.updated} />{product.prefix && <div className={styles.lot}><label>หมายเลข LOT</label><p><i />รอกำหนดหมายเลข LOT <span>(รูปแบบ: {product.prefix}-DDMMYY-XXXX)</span></p></div>}<div className={styles.estimate}><Info label="กำหนดเสร็จโดยประมาณ" value={product.estimate} /></div></div><div className={styles.progressLabel}><span>ความคืบหน้า</span><span>{done}/{product.steps.length} ขั้นตอน ({percent}%)</span></div><div className={styles.progress}><span style={{ width: `${percent}%` }} /></div><Timeline steps={product.steps} /></div>}</article>;
}
function Info({ label, value }) { return <div className={styles.info}><label>{label}</label><strong>{value}</strong></div>; }

export default function TrackingPage({ params }) {
  const resolvedParams = use(params);
  const tag = resolvedParams?.tag ? decodeURIComponent(resolvedParams.tag) : "TG-20250001";
  const [darkMode, setDarkMode] = useState(true);
  return <main className={styles.page}><header className={styles.header}><div className={styles.headerLeft}><Link href="/track" className={styles.backBtn}><ArrowLeft size={18} /><span>ย้อนกลับ</span></Link></div><div className={styles.brand}><img src="/logo-wordmark.png" alt="Naive Innova" className={styles.logo} /></div><div className={styles.headerRight}><button className={styles.themeBtn} onClick={() => setDarkMode(!darkMode)} title={darkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}>{darkMode ? <Sun size={19} /> : <Moon size={19} />}</button></div></header><section className={styles.shell}><div className={styles.orderTitle}><div><p className={styles.eyebrow}>TRACKING NO.</p><h1>{tag}</h1><p>สั่งซื้อ 10 ก.พ. 2568 <i /> 3 รายการสินค้า <strong>กำลังดำเนินการ 1</strong> จาก 3 รายการจัดส่งสำเร็จแล้ว</p></div><PackageCheck size={35} /></div><section className={styles.customer}><p className={styles.sectionLabel}>ข้อมูลผู้สั่งซื้อ</p><div><Info label="ชื่อ" value="หจก. รุ่งเรืองอุตสาหกรรม (สำนักงานใหญ่)" /><Info label="สินค้า" value="กล่องบรรจุภัณฑ์" /><Info label="จำนวน" value="1,200 ชิ้น" /><Info label="เลขที่งาน" value="JOB-2568-0042" /><Info label="วันที่ปรับปรุง" value="15 ก.พ. 2568" /><Info label="กำหนดเสร็จโดยประมาณ" value="20 ก.พ. 2568" /></div></section><h2><ClipboardList size={18} /> รายการสินค้าในคำสั่งซื้อนี้</h2><div className={styles.products}>{products.map((product, index) => <ProductCard product={product} defaultOpen={index === 0} key={product.id} />)}</div></section><footer className={styles.footer}><div className={styles.footerInner}><div className={styles.company}><img src="/logo-wordmark.png" alt="Naive Innova" /><p className={styles.companyDesc}>OEM Pet Care &amp; Animal Health บนเทคโนโลยีนาโนและสารสกัดธรรมชาติ<br />Spin-off จากคณะสัตวแพทย์ จุฬาฯ</p><div className={styles.contactRows}><a href="tel:0877149262" className={styles.contactRow}><span className={styles.contactIcon}><Phone size={14} /></span><span>087-714-9262 · 094-888-1184</span></a><a href="mailto:info@naiveinnova.com" className={styles.contactRow}><span className={styles.contactIcon}><Mail size={14} /></span><span>info@naiveinnova.com</span></a><span className={styles.contactRow}><span className={styles.contactIcon}><MessageCircle size={14} /></span><span>LINE: @naivepetcare</span></span><span className={styles.contactRow}><span className={styles.contactIcon}><MapPin size={14} /></span><span>144/1 ต.สายเหนือ อ.พาน จ.เชียงราย 57120</span></span></div></div><div className={styles.footerCol}><b className={styles.colTitle}>บริการ</b><a href="#">รับผลิต OEM</a><a href="#">Custom Formula</a><a href="#">Brand Building</a><a href="#">Regulatory Support</a></div><div className={styles.footerCol}><b className={styles.colTitle}>ข้อมูล</b><a href="#">เกี่ยวกับเรา</a><a href="#">นวัตกรรม &amp; สารสกัด</a><a href="#">บทความ &amp; สื่อ</a><a href="#">วิดีโอ</a></div><div className={styles.footerCol}><b className={styles.colTitle}>ช่วยเหลือ</b><a href="#">นัดหมายสร้างแบรนด์</a><a href="#">คำถามที่พบบ่อย</a><a href="#">แผนที่โรงงาน</a><a href="#">Factory Tour</a></div></div><div className={styles.footerBottom}><small className="styles.Copyright">© 2026 NAIVE INNOVA CO., LTD. · ALL RIGHTS RESERVED · นวัตกรรมสัตว์เลี้ยง</small></div></footer></main>;
}