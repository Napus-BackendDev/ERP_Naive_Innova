"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, ChevronRight, ClipboardList, FileImage, PackageCheck, X, Phone, Mail, MessageCircle, MapPin, Sun, Moon, AlertCircle
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
  "พัฒนาสูตร": "วิจัยและพัฒนาสูตรผลิตภัณฑ์ใหม่ทดลองตามความต้องการของลูกค้า ตรวจสอบคุณสมบัติให้ได้ตามเกณฑ์มาตรฐานก่อนเริ่มผลิต",
  "R&D QC – ตรวจสอบคุณภาพจาก R&D": "ทีม R&D ตรวจสอบคุณภาพผลิตภัณฑ์ตามมาตรฐานที่กำหนด ครอบคลุมคุณสมบัติทางกายภาพ ทางเคมี และทางจุลชีววิทยา ก่อนส่งต่อฝ่าย Production",
  "Production ถ่ายรูปประกอบบรรจุภัณฑ์ขวด": "บันทึกภาพถ่ายขั้นตอนการบรรจุสินค้าลงขวด แสดงความถูกต้องของปริมาณและกระบวนการบรรจุ ใช้เป็นหลักฐานยืนยันมาตรฐานการผลิตส่งมอบให้ลูกค้า",
  "Production ถ่ายรูปติดสติกเกอร์": "บันทึกภาพถ่ายการติดฉลากสติกเกอร์บนผลิตภัณฑ์ ตรวจสอบความถูกต้องของข้อมูลบนฉลาก ได้แก่ ชื่อสินค้า ส่วนประกอบ และวันหมดอายุ",
  "Production ถ่ายรูปยิง LOT": "บันทึกภาพถ่ายการพิมพ์หมายเลข LOT และวันผลิต/หมดอายุลงบนผลิตภัณฑ์ เพื่อการตรวจสอบย้อนกลับและยืนยันว่าสินค้าทุกชิ้นมีหมายเลขที่ถูกต้อง",
  "Production ถ่ายรูป Finish Product": "บันทึกภาพถ่ายผลิตภัณฑ์สำเร็จรูปที่พร้อมจัดส่ง แสดงสภาพภายนอกและการบรรจุหีบห่อที่สมบูรณ์ ใช้เป็นหลักฐานยืนยันคุณภาพก่อนออกจากโรงงาน",
  "นำสินค้าส่งทางไปรษณีย์": "จัดเตรียมเอกสารการจัดส่ง บันทึกภาพถ่ายสินค้าก่อนส่งมอบ นำสินค้าส่งผ่านไปรษณีย์หรือบริษัทขนส่งที่กำหนด พร้อมแจ้งหมายเลขพัสดุให้ลูกค้าทราบ",
};

const statusStyle = {
  "รอเตรียมผลิต": "ready",
  "กำลังผลิต": "making",
  "รอบรรจุ": "packing",
  "รอ QC": "qc",
  "พร้อมส่ง": "ready",
  "ส่งมอบสำเร็จ": "delivered",
};
const flowStyle = { "ปรับสูตร": "adjust", "ผลิตตามสูตร": "standard", "พัฒนาสูตร": "develop" };

function formatDate(dateStr) {
  if (!dateStr) return "รอดำเนินการ";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = date.getDate();
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

function buildProductSteps(product, customer) {
  const formulaStepLabel = product.customerFormulaType || "ผลิตตามสูตร";
  const stepLabels = [
    "ออเดอร์",
    "ลิ้งค์แท็ค",
    "บรรจุภัณฑ์ / สินค้า",
    formulaStepLabel,
    "ผลิต",
    "R&D QC – ตรวจสอบคุณภาพจาก R&D",
    "Production ถ่ายรูปประกอบบรรจุภัณฑ์ขวด",
    "Production ถ่ายรูปติดสติกเกอร์",
    "Production ถ่ายรูปยิง LOT",
    "Production ถ่ายรูป Finish Product",
    "นำสินค้าส่งทางไปรษณีย์",
  ];

  const currentStep = product.productionStep || 1;
  const isDelivered = product.productionStatus === "ส่งมอบสำเร็จ";

  return stepLabels.map((label, index) => {
    const stepNum = index + 1;
    let status = "pending";
    if (isDelivered || stepNum < currentStep) {
      status = "done";
    } else if (stepNum === currentStep) {
      status = "active";
    }

    let date = null;
    if (status === "done" || status === "active") {
      if (stepNum === 1 || stepNum === 2) date = formatDate(customer.createdAt);
      else if (stepNum === 6) date = formatDate(product.rndQcAt || product.scheduleStartDate);
      else date = formatDate(product.scheduleStartDate);
    }

    let photo = null;
    if (label === "บรรจุภัณฑ์ / สินค้า") photo = product.qcPackagingPhoto;
    else if (label === "R&D QC – ตรวจสอบคุณภาพจาก R&D") photo = product.rndQcPhotos?.[0] || photos.qc;
    else if (label === "Production ถ่ายรูปประกอบบรรจุภัณฑ์ขวด") photo = product.qcPumpPhoto || photos.bottle;
    else if (label === "Production ถ่ายรูปติดสติกเกอร์") photo = product.qcStickerPhoto || photos.label;
    else if (label === "Production ถ่ายรูปยิง LOT") photo = photos.lot;
    else if (label === "Production ถ่ายรูป Finish Product") photo = product.productImageUrl || photos.finish;

    const tracking = label === "นำสินค้าส่งทางไปรษณีย์";

    return {
      label,
      desc: descriptions[label] || descriptions["ผลิต"],
      status,
      date,
      photo,
      tracking,
    };
  });
}

function Dot({ status }) {
  return (
    <span className={`${styles.dot} ${styles[status]}`}>
      {status === "done" && <Check size={9} strokeWidth={3} />}
      {status === "active" && <i />}
    </span>
  );
}

function PhotoSlot({ photo, active }) {
  const ref = useRef(null);
  const [image, setImage] = useState(null);
  const [visible, setVisible] = useState(true);
  const shown = image || (visible && photo);
  if (!shown) {
    return (
      <button
        className={`${styles.uploadEmpty} ${!active ? styles.disabled : ""}`}
        disabled={!active}
        onClick={() => ref.current?.click()}
      >
        <FileImage size={23} />
        <span>{active ? "อัปโหลดรูปหลักฐาน" : "รอดำเนินการ"}</span>
      </button>
    );
  }
  return (
    <div className={styles.photo}>
      <img src={shown} alt="หลักฐาน" />
      <span className={styles.sample}>{image ? "✓ รูปจริง" : "ตัวอย่าง"}</span>
      <div className={styles.photoActions}>
        {active && <button onClick={() => ref.current?.click()}>แทนที่ด้วยรูปจริง</button>}
        <button onClick={() => { setImage(null); setVisible(false); }}>ลบ</button>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => e.target.files?.[0] && setImage(URL.createObjectURL(e.target.files[0]))}
      />
    </div>
  );
}

function Tracking({ active }) {
  const [value, setValue] = useState("");
  return (
    <div className={styles.tracking}>
      <label>หมายเลขพัสดุ / Tracking No.</label>
      <div>
        <input
          disabled={!active}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={active ? "กรอกหมายเลขพัสดุ เช่น EY123456789TH" : "รอดำเนินการ"}
        />
        {value && <button onClick={() => setValue("")}><X size={15} /></button>}
      </div>
      {value && <small>✓ บันทึกหมายเลขพัสดุแล้ว</small>}
    </div>
  );
}

function Timeline({ steps }) {
  return (
    <div className={styles.timeline}>
      {steps.map((step, index) => (
        <div className={styles.step} key={step.label}>
          <div className={styles.rail}>
            <Dot status={step.status} />
            {index < steps.length - 1 && (
              <span className={`${styles.line} ${step.status === "done" ? styles.lineDone : ""}`} />
            )}
          </div>
          <div className={styles.stepBody}>
            <div className={styles.stepTop}>
              <div>
                <h4>{step.label}</h4>
                <p>{step.desc}</p>
              </div>
              <time>{step.date || "รอดำเนินการ"}</time>
            </div>
            <em className={styles[`state${step.status}`]}>
              {step.status === "done" ? "ดำเนินการเสร็จสิ้น" : step.status === "active" ? "กำลังดำเนินการ" : "รอดำเนินการ"}
            </em>
            {step.photo && <PhotoSlot photo={step.photo} active={step.status !== "pending"} />}
            {step.tracking && <Tracking active={step.status !== "pending"} />}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductCard({ product, customer, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const steps = buildProductSteps(product, customer);
  const done = steps.filter((s) => s.status === "done").length;
  const percent = Math.round((done / steps.length) * 100);

  const jobNo = product.producedLotId
    ? `JOB-${String(product.producedLotId).slice(-4).toUpperCase()}`
    : customer._id
    ? `JOB-${String(customer._id).slice(-4).toUpperCase()}`
    : "JOB-0000";

  return (
    <article className={styles.product}>
      <button className={styles.productHead} onClick={() => setOpen(!open)}>
        <div className={styles.productTitle}>
          <ChevronRight className={open ? styles.openChevron : ""} size={19} />
          <div>
            <h3>{product.formulaName || "สินค้าสั่งผลิต"}</h3>
            <span className={`${styles.flow} ${styles[flowStyle[product.customerFormulaType] || "standard"]}`}>
              {product.customerFormulaType || "ผลิตตามสูตร"}
            </span>
            <span className={styles.quantity}>{(Number(product.quantityPcs) || 0).toLocaleString()} ชิ้น</span>
          </div>
        </div>
        <div className={styles.statusWrap}>
          <span className={`${styles.status} ${styles[statusStyle[product.productionStatus] || "ready"]}`}>
            {product.productionStatus || "รอเตรียมผลิต"}
          </span>
          <small>{product.packagingType || "กำลังดำเนินการ"}</small>
        </div>
      </button>
      {open && (
        <div className={styles.productContent}>
          <div className={styles.infoGrid}>
            <Info label="ชื่อสินค้า" value={product.formulaName || "สินค้าสั่งผลิต"} />
            <Info label="จำนวน" value={`${(Number(product.quantityPcs) || 0).toLocaleString()} ชิ้น`} />
            <Info label="เลขที่งาน" value={jobNo} />
            <Info label="วันที่ปรับปรุง" value={formatDate(customer.updatedAt)} />
            {product.lotStampNo ? (
              <div className={styles.lot}>
                <label>หมายเลข LOT</label>
                <p>
                  <i />
                  <strong>{product.lotStampNo}</strong>
                  <span>(ผลิต: {formatDate(product.lotStampMfg)} / หมดอายุ: {formatDate(product.lotStampExp)})</span>
                </p>
              </div>
            ) : (
              <div className={styles.lot}>
                <label>หมายเลข LOT</label>
                <p>
                  <i />
                  รอกำหนดหมายเลข LOT <span>(รูปแบบ: {(product.brand || customer.brand || "NV").slice(0, 2).toUpperCase()}-DDMMYY-XXXX)</span>
                </p>
              </div>
            )}
            <div className={styles.estimate}>
              <Info label="กำหนดเสร็จโดยประมาณ" value={formatDate(product.scheduleEndDate || customer.dueDate)} />
            </div>
          </div>
          <div className={styles.progressLabel}>
            <span>ความคืบหน้า</span>
            <span>{done}/{steps.length} ขั้นตอน ({percent}%)</span>
          </div>
          <div className={styles.progress}>
            <span style={{ width: `${percent}%` }} />
          </div>
          <Timeline steps={steps} />
        </div>
      )}
    </article>
  );
}

function Info({ label, value }) {
  return (
    <div className={styles.info}>
      <label>{label}</label>
      <strong>{value}</strong>
    </div>
  );
}

function TrackingSkeleton() {
  return (
    <div className={styles.shell}>
      <div className={styles.orderTitle}>
        <div style={{ width: "100%" }}>
          <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: "120px" }} />
          <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
          <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: "70%" }} />
        </div>
      </div>
      <section className={styles.customer}>
        <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: "100px", marginBottom: "16px" }} />
        <div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.info}>
              <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: "50%" }} />
              <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: "80%" }} />
            </div>
          ))}
        </div>
      </section>
      <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: "200px", margin: "32px 0 13px" }} />
      <div className={styles.products}>
        <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
        <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
      </div>
    </div>
  );
}

export default function TrackingPage({ params }) {
  const resolvedParams = use(params);
  const tagParam = resolvedParams?.tag ? decodeURIComponent(resolvedParams.tag).toUpperCase() : "";
  const [darkMode, setDarkMode] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const fetchUrl = `${apiUrl}/track/${encodeURIComponent(tagParam)}`;

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(res.status === 404 ? "ไม่พบข้อมูลหมายเลขแท็กหรือคำสั่งซื้อนี้" : "เกิดข้อผิดพลาดในการโหลดข้อมูลคำสั่งซื้อ");
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          if (data.success && data.customer) {
            setCustomer(data.customer);
          } else {
            setError(data.message || "ไม่พบข้อมูลแท็กหรือคำสั่งซื้อนี้");
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "ไม่สามารถเชื่อมต่อกับระบบเพื่อดึงข้อมูลสถานะได้");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [tagParam]);

  const orderedProducts = customer?.orderedProducts || [];
  const totalProducts = orderedProducts.length;
  const inProgressCount = orderedProducts.filter((p) => p.productionStatus !== "ส่งมอบสำเร็จ").length;
  const totalQtyPcs = orderedProducts.reduce((sum, p) => sum + (Number(p.quantityPcs) || 0), 0);
  const mainPackaging = orderedProducts[0]?.packagingType || "บรรจุภัณฑ์มาตรฐาน";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/track" className={styles.backBtn}>
            <ArrowLeft size={18} />
            <span>ย้อนกลับ</span>
          </Link>
        </div>
        <div className={styles.brand}>
          <img src="/logo-wordmark.png" alt="Naive Innova" className={styles.logo} />
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.themeBtn}
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
          >
            {darkMode ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>

      {loading ? (
        <TrackingSkeleton />
      ) : error ? (
        <section className={styles.shell}>
          <div className={styles.errorBox}>
            <AlertCircle size={48} color="#f87171" style={{ marginBottom: "16px" }} />
            <h3>ไม่พบข้อมูลการติดตาม</h3>
            <p>{error}</p>
            <Link href="/track" className={styles.backBtn} style={{ display: "inline-flex", background: "#1e2d46", padding: "10px 20px" }}>
              <ArrowLeft size={16} />
              <span>กลับไปหน้าค้นหาคำสั่งซื้อ</span>
            </Link>
          </div>
        </section>
      ) : customer ? (
        <section className={styles.shell}>
          <div className={styles.orderTitle}>
            <div>
              <p className={styles.eyebrow}>TRACKING NO.</p>
              <h1>{customer.trackingNo}</h1>
              <p>
                สั่งซื้อ {formatDate(customer.createdAt)} <i /> {totalProducts} รายการสินค้า{" "}
                <strong>กำลังดำเนินการ {inProgressCount}</strong> จาก {totalProducts} รายการจัดส่งสำเร็จแล้ว
              </p>
            </div>
            <PackageCheck size={35} />
          </div>
          <section className={styles.customer}>
            <p className={styles.sectionLabel}>ข้อมูลผู้สั่งซื้อ</p>
            <div>
              <Info label="ชื่อ" value={customer.name} />
              <Info label="สินค้า" value={mainPackaging} />
              <Info label="จำนวน" value={`${totalQtyPcs.toLocaleString()} ชิ้น`} />
              <Info label="เลขที่งาน" value={customer._id ? `JOB-${String(customer._id).slice(-4).toUpperCase()}` : "JOB-0000"} />
              <Info label="วันที่ปรับปรุง" value={formatDate(customer.updatedAt)} />
              <Info label="กำหนดเสร็จโดยประมาณ" value={formatDate(customer.dueDate)} />
            </div>
          </section>
          <h2><ClipboardList size={18} /> รายการสินค้าในคำสั่งซื้อนี้</h2>
          <div className={styles.products}>
            {orderedProducts.map((product, index) => (
              <ProductCard
                product={product}
                customer={customer}
                defaultOpen={index === 0}
                key={product.formulaId || product._id || index}
              />
            ))}
          </div>
        </section>
      ) : null}

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.company}>
            <img src="/logo-wordmark.png" alt="Naive Innova" />
            <p className={styles.companyDesc}>
              OEM Pet Care &amp; Animal Health บนเทคโนโลยีนาโนและสารสกัดธรรมชาติ<br />
              Spin-off จากคณะสัตวแพทย์ จุฬาฯ
            </p>
            <div className={styles.contactRows}>
              <a href="tel:0877149262" className={styles.contactRow}>
                <span className={`${styles.contactIcon} ${styles.contactOdd}`}><Phone size={14} /></span>
                <span>087-714-9262 · 094-888-1184</span>
              </a>
              <a href="mailto:info@naiveinnova.com" className={styles.contactRow}>
                <span className={`${styles.contactIcon} ${styles.contactEven}`}><Mail size={14} /></span>
                <span>info@naiveinnova.com</span>
              </a>
              <span className={styles.contactRow}>
                <span className={`${styles.contactIcon} ${styles.contactOdd}`}><MessageCircle size={14} /></span>
                <span>LINE: {customer?.line || "@naivepetcare"}</span>
              </span>
              <span className={styles.contactRow}>
                <span className={`${styles.contactIcon} ${styles.contactEven}`}><MapPin size={14} /></span>
                <span>{customer?.address || "โรงงาน Naive Innova"}</span>
              </span>
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