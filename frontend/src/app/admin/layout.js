"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (!token || !storedUser) {
      router.push("/login");
    }
  }, [router]);

  // Completely bypass Sidebar/Navbar layout for Kanban page to make it full screen
  if (pathname === "/admin/production/kanban") {
    return <div className="w-full min-h-screen bg-slate-950">{children}</div>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
