"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const mockLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_MOCK_LOGIN === "true";

  const clearClientSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
  };

  useEffect(() => {
    // Check if redirected back from Google OAuth with token and user parameters
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userStr = params.get("user");
    const errorParam = params.get("error");
    const approval = params.get("approval");

    if (errorParam || params.get("pendingApproval") || approval === "rejected") {
      // Never let an old Admin token survive a new OAuth attempt that did not
      // produce an approved session.
      clearClientSession();
    }

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    } else if (params.get("loggedOut")) {
      setNotice("ออกจากระบบเรียบร้อยแล้ว");
    } else if (params.get("accountDeleted")) {
      setNotice("ลบบัญชีออกจากระบบแล้ว หากเข้าสู่ระบบอีกครั้ง บัญชีจะเริ่มเป็น User และต้องรอ Admin อนุมัติใหม่");
    } else if (params.get("pendingApproval")) {
      if (params.get("emailDelivery") === "failed") {
        setError("บันทึกคำขอแล้ว แต่ส่งอีเมลแจ้ง Admin ไม่สำเร็จ กรุณาให้ Admin ตรวจคำขอจากหน้า User Management หรือตรวจการตั้งค่า Gmail บน Render");
      } else {
        setNotice("ส่งคำขอไปยังผู้ดูแลแล้ว กรุณารอการยืนยันทาง Gmail แล้วเข้าสู่ระบบอีกครั้ง");
      }
    } else if (approval === "approved") {
      setNotice("ยืนยันผู้ใช้สำเร็จแล้ว ผู้ใช้สามารถเข้าสู่ระบบด้วย Google ได้ทันที");
    } else if (approval === "invalid") {
      setError("ลิงก์ยืนยันไม่ถูกต้อง หมดอายุ หรือถูกใช้งานแล้ว");
    } else if (approval === "rejected") {
      setError("คำขอเข้าใช้ถูกปฏิเสธ บัญชีนี้ถูกล็อกเป็นเวลา 4 ชั่วโมง");
    } else if (approval === "error") {
      setError("ยืนยันไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ");
    } else if (params.get("expired")) {
      // Set by the api 401 interceptor, so a bounced-out user is told why they
      // are back here instead of silently landing on the login screen.
      setError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
    }

    if (token && userStr) {
      localStorage.setItem("token", token);
      localStorage.setItem("user", userStr);
      router.replace("/admin");
    }
  }, []);

  const handleRealGoogleLogin = async () => {
    setLoading(true);
    clearClientSession();
    try {
      await fetch(`${api.defaults.baseURL}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (error) {
      // Client credentials are already removed; continue to Google OAuth.
    }
    window.location.href = `${api.defaults.baseURL}/auth/google`;
  };

  const handleGoogleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Simulate Google OAuth flow by calling our mock-login backend
      const response = await api.post("/auth/mock-login");
      const { token, user } = response.data;
      
      // Save details
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      
      // Redirect to admin
      router.replace("/admin");
    } catch (err) {
      setError(err.response?.data?.message || "การเชื่อมต่อกับระบบหลังบ้านล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="antialiased text-on-background bg-background min-h-dvh md:overflow-hidden md:h-screen md:max-h-screen">
      {/* Soft ambient background gradients */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary-fixed-dim blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary-fixed blur-[100px] pointer-events-none"></div>
      
      <div className="min-h-dvh w-full flex flex-col md:flex-row relative md:h-screen md:overflow-hidden">
        {/* Left Side: Immersive Mascot Image */}
        <div className="w-full md:w-[55%] h-[30vh] sm:h-[36vh] md:h-screen shrink-0 relative flex items-center justify-center overflow-hidden bg-white">
          <img 
            alt="Naive Ops Mascot" 
            className="absolute inset-0 w-full h-full object-cover object-center md:scale-105" 
            src="/login_mascot_cat.png"
          />
          <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-transparent via-transparent to-[#f8fafc] pointer-events-none"></div>
        </div>
        
        {/* Right Side: Focused Interaction Area */}
        <div className="w-full md:w-[45%] md:h-screen flex items-center justify-center p-4 py-8 md:p-8 lg:p-12 relative z-10 md:overflow-hidden">
          {/* Floating Glassmorphism Container */}
          <div className="w-full max-w-md bg-surface-container-lowest backdrop-blur-xl rounded-[2rem] p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-slate-200/50 relative overflow-hidden my-auto">
            {/* Decorative corner glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl"></div>
            
            <div className="flex flex-col items-start text-left mb-6 relative z-10">
              {/* Brand logo — real artwork, with a dark-theme copy because the
                  navy half of the wordmark disappears on the dark card. */}
              <img src="/logo-wordmark.png" alt="Naive Innova" className="brand-light h-24 w-auto object-contain mb-6 self-center" />
              <img src="/logo-dark.png" alt="Naive Innova" className="brand-dark h-24 w-auto object-contain mb-6 self-center" />
              <h1 className="text-on-background text-3xl md:text-4xl leading-tight font-bold tracking-tight mb-2">Welcome to <br />Naive Ops</h1>
              <p className="text-on-surface-variant text-sm max-w-xs">Access your Manufacturing &amp; ERP Suite to manage operations intelligently.</p>
            </div>
            
            {/* Login Form / Actions */}
            <div className="w-full flex flex-col gap-5 relative z-10">
              {error && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-md">
                  {error}
                </div>
              )}
              {notice && (
                <div className="p-3 text-xs bg-green-500/10 border border-green-500/20 text-green-700 rounded-md">
                  {notice}
                </div>
              )}

              {mockLoginEnabled && <form onSubmit={handleGoogleLogin} className="flex flex-col gap-5 mb-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-on-surface-variant ml-1">Email Address</label>
                  <input 
                    className="w-full bg-white/70 border border-slate-200 rounded-2xl h-14 px-5 text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all backdrop-blur-sm shadow-inner" 
                    placeholder="name@company.com" 
                    type="email"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-sm font-medium text-on-surface-variant">Password</label>
                    <a className="text-xs text-primary hover:text-green-600 transition-colors font-medium" href="#">Forgot Password?</a>
                  </div>
                  <input 
                    className="w-full bg-white/70 border border-slate-200 rounded-2xl h-14 px-5 text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all backdrop-blur-sm shadow-inner" 
                    placeholder="••••••••" 
                    type="password"
                    required
                  />
                </div>
                <button 
                  disabled={loading}
                  className="w-full bg-primary text-white h-14 rounded-2xl font-bold text-base hover:bg-green-600 hover:shadow-lg transition-all mt-3 shadow-md hover:-translate-y-0.5" 
                  type="submit"
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>
              </form>}
              
              {mockLoginEnabled && <div className="flex items-center gap-4 my-2">
                <div className="h-px bg-[#374151] flex-1"></div>
                <span className="text-xs font-semibold text-outline uppercase tracking-wider">or continue with</span>
                <div className="h-px bg-[#374151] flex-1"></div>
              </div>}
              
              <button 
                onClick={handleRealGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 hover:bg-slate-100 hover:shadow-md rounded-2xl h-14 px-6 font-semibold text-base transition-all shadow-sm hover:-translate-y-0.5"
              >
                <svg className="h-5 w-5 mr-1" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.4 3.65 1.57 7.53l3.88 3.01c.91-2.73 3.48-4.5 6.55-4.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.47h6.46c-.28 1.47-1.11 2.72-2.36 3.56l3.66 2.84c2.14-1.98 3.39-4.89 3.39-8.53z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.45 14.29c-.23-.69-.36-1.43-.36-2.2s.13-1.51.36-2.2L1.57 6.88C.57 8.87 0 11.08 0 13.41c0 2.33.57 4.54 1.57 6.53l3.88-3.01z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.09-4.3 1.09-3.07 0-5.64-1.77-6.55-4.5H1.57l-3.88 3.01C3.4 20.35 7.35 23 12 23z"
                  />
                </svg>
                <span>{loading ? "กำลังไปยัง Google..." : "Google Account"}</span>
              </button>
            </div>
            
            {/* Footer Note */}
            <div className="mt-10 relative z-10 text-left">
              <p className="text-outline text-sm font-medium">
                Protected by <span className="text-primary hover:text-green-400 transition-colors cursor-pointer underline underline-offset-4 decoration-primary/30">Row Isolation Policy</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
