"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, X, Search, Shield, UserCheck, Trash2, ShieldAlert, CheckCircle, Edit2, Filter, XCircle, Clock3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "@heroui/react";
import HeroBanner from "@/components/dashboard/HeroBanner";
import Select from "@/components/ui/Select";

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingRole, setEditingRole] = useState("User");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loadError, setLoadError] = useState("");
  const [rolesLoaded, setRolesLoaded] = useState(true);
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewingUserId, setReviewingUserId] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchUsers(token);
    fetchRoles(token);
  }, []);

  const retryLoad = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchUsers(token);
    fetchRoles(token);
  };

  const fetchUsers = async (token) => {
    setLoading(true);
    setLoadError("");

    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      if (error.response?.status === 403) {
        setAccessDenied(true);
        router.replace("/admin/cockpit");
        return;
      }
      setLoadError("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async (token) => {
    try {
      const res = await api.get("/users/roles");
      setRoles(res.data);
      setRolesLoaded(true);
    } catch (error) {
      console.error("Error fetching roles:", error);
      setRolesLoaded(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!rolesLoaded) return;

    setModalError("");
    setSuccessMsg("");
    setSubmitting(true);

    const form = e.target;
    const newUserData = {
      name: form.name.value,
      email: form.email.value,
      role: form.role.value,
      line: form.line.value,
      facebook: form.facebook.value,
      tiktok: form.tiktok.value
    };

    try {
      const res = await api.post("/users", newUserData);
      setUsers([...users, res.data]);
      setModalOpen(false);
      setSuccessMsg("เพิ่มผู้ใช้งานระบบสำเร็จแล้ว");
      form.reset();
    } catch (error) {
      setModalError(error.response?.data?.message || "ไม่สามารถลงทะเบียนผู้ใช้ได้");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();

    setModalError("");
    setSuccessMsg("");
    setSubmitting(true);

    const form = e.target;
    const updatedData = {
      name: form.name.value,
      email: form.email.value,
      role: form.role.value
    };

    try {
      const res = await api.put(`/users/${editingUser._id}`, updatedData);
      setUsers(users.map(u => u._id === editingUser._id ? res.data : u));
      setEditModalOpen(false);
      setEditingUser(null);
      setSuccessMsg(`แก้ไขข้อมูลผู้ใช้งาน "${updatedData.name}" สำเร็จ`);
    } catch (error) {
      setModalError(error.response?.data?.message || "ไม่สามารถแก้ไขข้อมูลผู้ใช้งานได้");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลสิทธิ์ของ "${userName}" ออกจากระบบ?`)) return;

    try {
      const response = await api.delete(`/users/${userId}`);
      if (response.data.selfDeleted) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        await fetch(`${api.defaults.baseURL}/auth/logout`, {
          method: "POST",
          credentials: "include"
        }).catch(() => {});
        window.location.replace("/login?accountDeleted=1");
        return;
      }
      setUsers(users.filter(u => u._id !== userId));
      setSuccessMsg(`ลบผู้ใช้งาน "${userName}" สำเร็จ`);
    } catch (error) {
      setErrorMsg(error.response?.data?.message || "ไม่สามารถลบข้อมูลผู้ใช้งานได้");
    }
  };

  const handleApprovalDecision = async (user, decision) => {
    const action = decision === "approved" ? "อนุมัติ" : "ปฏิเสธ";
    if (!window.confirm(`ยืนยันการ${action}คำขอของ "${user.name}"?`)) return;

    setErrorMsg("");
    setSuccessMsg("");
    setReviewingUserId(user._id);
    try {
      const res = await api.post(`/users/${user._id}/approval`, { decision });
      setUsers((current) => current.map((item) => item._id === user._id ? res.data : item));
      setSuccessMsg(`${action}คำขอของ "${user.name}" สำเร็จ`);
    } catch (error) {
      setErrorMsg(error.response?.data?.message || `ไม่สามารถ${action}คำขอได้`);
    } finally {
      setReviewingUserId("");
    }
  };

  const filteredUsers = users
    .filter(u => {
      if (u.approvalStatus !== "approved") return false;
      const roleName = u.role && typeof u.role === "object" ? u.role.name : u.role;
      const matchesRole = roleFilter === "all" || roleName === roleFilter;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        (u.name || "").toLowerCase().includes(query) ||
        (u.email || "").toLowerCase().includes(query) ||
        (roleName || "").toLowerCase().includes(query);
      return matchesRole && matchesSearch;
    })
    .sort((a, b) => {
      const roleA = a.role && typeof a.role === "object" ? a.role.name : a.role;
      const roleB = b.role && typeof b.role === "object" ? b.role.name : b.role;
      const roleOrder = { Admin: 0, User: 1 };
      const roleDifference = (roleOrder[roleA] ?? 2) - (roleOrder[roleB] ?? 2);
      return roleDifference || (a.name || "").localeCompare(b.name || "", "th");
    });

  const pendingUsers = users
    .filter((user) => user.approvalStatus === "pending")
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

  if (loading || accessDenied) {
    return (
      <div className="animate-pulse space-y-6 text-left select-none">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-6 w-48 bg-slate-200 rounded-lg mb-1" />
            <div className="h-3.5 w-64 bg-slate-150 rounded" />
          </div>
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
        </div>
        {/* Table skeleton */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="h-8 w-64 bg-slate-100 rounded-lg" />
          </div>
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between">
              <div className="h-4 w-1/4 bg-slate-200 rounded" />
              <div className="h-4 w-1/6 bg-slate-200 rounded" />
              <div className="h-4 w-1/6 bg-slate-200 rounded" />
              <div className="h-4 w-1/6 bg-slate-200 rounded" />
            </div>
            {[1, 2, 3, 4].map(row => (
              <div key={row} className="p-4 border-b border-slate-100 flex justify-between items-center">
                <div className="h-4 w-1/3 bg-slate-100 rounded" />
                <div className="h-4 w-12 bg-slate-100 rounded" />
                <div className="h-6 w-16 bg-slate-100 rounded-full" />
                <div className="h-4 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 select-none text-left">
      <HeroBanner
        title="User Management"
        subtitle="ระบบจัดการบัญชีผู้ใช้งาน สิทธิ์การเข้าถึง และข้อมูลเจ้าหน้าที่ทีม Naive Ops"
        onCreateManual={() => { setModalError(""); setModalOpen(true); }}
        createLabel="เพิ่มผู้ใช้งานใหม่"
      />

      {/* Load Error Banner */}
      {loadError && !loading && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" /> {loadError}
          </span>
          <button
            onClick={retryLoad}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer text-[15px] font-bold shrink-0"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {/* Message Alerts */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" /> {successMsg}
        </div>
      )}

      {pendingUsers.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-amber-900">
                <Clock3 className="h-4 w-4" /> คำขอรอตรวจสอบ
              </h2>
              <p className="mt-1 text-[14px] text-amber-700">บัญชีส่วนนี้ยังไม่แสดงในตารางผู้ใช้งานจนกว่า Admin จะอนุมัติ</p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{pendingUsers.length} คำขอ</span>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingUsers.map((user) => (
              <div key={user._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name || "User Profile"} className="h-9 w-9 rounded-full border border-slate-200 object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-200 bg-amber-100 text-xs font-bold text-amber-800">
                      {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{user.name}</p>
                    <p className="text-[14px] text-slate-400">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-2 sm:justify-end">
                  <button
                    onClick={() => handleApprovalDecision(user, "approved")}
                    disabled={reviewingUserId === user._id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 font-bold text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" /> อนุมัติ
                  </button>
                  <button
                    onClick={() => handleApprovalDecision(user, "rejected")}
                    disabled={reviewingUserId === user._id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" /> ปฏิเสธ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input 
            type="text" 
            placeholder="ค้นหาชื่อ อีเมล หรือบทบาท..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 text-slate-800 shadow-xs"
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          icon={Filter}
          aria-label="กรองตามบทบาท"
          className="w-full sm:w-44"
          options={[
            { value: "all", label: "ทุกบทบาท" },
            { value: "Admin", label: "Admin" },
            { value: "User", label: "User" }
          ]}
        />
      </div>

      {/* Users Grid Table */}
      <div className="w-full overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-xs p-1">
        <table className="w-full text-xs text-left text-slate-500 border-collapse">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[14px] uppercase tracking-wider">
            <tr>
              <th className="px-5 py-4">ผู้ใช้งาน</th>
              <th className="px-5 py-4">บทบาทหน้าที่ (Role)</th>
              <th className="px-5 py-4 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {filteredUsers.map((u) => {
              const roleName = u.role && typeof u.role === "object" ? u.role.name : u.role;
              return (
                <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 flex items-center gap-3">
                    {u.avatarUrl ? (
                      <img 
                        src={u.avatarUrl} 
                        alt={u.name || "User Profile"} 
                        className="h-8 w-8 rounded-full object-cover border border-slate-200 shadow-2xs flex-shrink-0" 
                        onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                      />
                    ) : null}
                    <div 
                      className="h-8 w-8 rounded-full bg-green-100 text-green-800 font-bold text-xs flex items-center justify-center border border-green-200 flex-shrink-0"
                      style={{ display: u.avatarUrl ? "none" : "flex" }}
                    >
                      {u.name ? u.name.slice(0, 2).toUpperCase() : "U"}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-slate-900">{u.name}</span>
                      <span className="text-[14px] text-slate-400">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      {roleName === "Admin" ? (
                        <Shield className="h-3.5 w-3.5 text-red-500" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                      )}
                      <span className="font-bold text-slate-700">{roleName || "User"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex gap-2 justify-end">
                      <button 
                        onClick={() => {
                          setModalError("");
                          setEditingUser(u);
                          setEditingRole((u.role && typeof u.role === "object" ? u.role.name : u.role) || "User");
                          setEditModalOpen(true);
                        }}
                        className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-green-600 hover:bg-green-50 cursor-pointer transition-colors"
                        title="แก้ไขข้อมูล"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u._id, u.name)}
                        className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                        title="ลบสิทธิ์สมาชิก"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create New User Modal */}
      {modalOpen && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" 
            onClick={() => setModalOpen(false)}
          />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                <h2 className="text-base font-bold text-slate-800">เพิ่มผู้ใช้งานใหม่เข้าในระบบ</h2>
                <button className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setModalOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="p-6 space-y-4 flex flex-col text-left overflow-y-auto max-h-[75vh]">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">ชื่อ-นามสกุลสมาชิก</label>
                  <input name="name" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-medium" placeholder="เช่น นายสมชาย ใจดี" type="text"/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">อีเมลล็อกอิน</label>
                  <input name="email" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-medium" placeholder="เช่น somchai@gmail.com" type="email"/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">บทบาทสิทธิ์ (Role)</label>
                  <select name="role" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold cursor-pointer">
                    {roles.map(r => (
                      <option key={r._id} value={r._id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">Line ID</label>
                  <input name="line" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-medium" placeholder="ระบุ Line ID สำหรับให้ติดต่อได้" type="text"/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">Facebook</label>
                  <input name="facebook" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-medium" placeholder="ระบุชื่อ Facebook ลูกค้า" type="text"/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">TikTok</label>
                  <input name="tiktok" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-medium" placeholder="ระบุชื่อบัญชี TikTok" type="text"/>
                </div>
                {!rolesLoaded && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-[15px] font-semibold rounded-xl">
                    โหลดข้อมูลบทบาท (Role) ไม่สำเร็จ ไม่สามารถเพิ่มผู้ใช้งานได้ กรุณาปิดหน้าต่างแล้วกด "ลองใหม่"
                  </div>
                )}
                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[15px] font-semibold rounded-xl flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" /> {modalError}
                  </div>
                )}
                <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 border-t border-slate-100 flex gap-3 bg-white shrink-0 pt-4 mt-2">
                  <button type="button" disabled={submitting} className="flex-grow border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-xs font-semibold disabled:opacity-50" onClick={() => setModalOpen(false)}>ยกเลิก</button>
                  <button type="submit" disabled={submitting || !rolesLoaded} className="flex-grow bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition-colors cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? "กำลังบันทึก..." : "ยืนยันการบันทึก"}</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Edit User Modal */}
      {editModalOpen && editingUser && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" 
            onClick={() => {
              setEditModalOpen(false);
              setEditingUser(null);
            }}
          />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                <h2 className="text-base font-bold text-slate-800">แก้ไขข้อมูลผู้ใช้งาน</h2>
                <button 
                  className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors" 
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingUser(null);
                  }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleEditUserSubmit} className="p-6 space-y-4 flex flex-col text-left overflow-y-auto max-h-[75vh]">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">ชื่อ-นามสกุลสมาชิก</label>
                  <input name="name" required defaultValue={editingUser.name} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-medium" placeholder="เช่น นายสมชาย ใจดี" type="text"/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">อีเมลล็อกอิน</label>
                  <input name="email" required defaultValue={editingUser.email} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-medium" placeholder="เช่น somchai@gmail.com" type="email"/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">บทบาทสิทธิ์ (Role)</label>
                  <select
                    name="role"
                    value={roles.find((role) => role.name === editingRole)?._id || ""}
                    onChange={(event) => {
                      const selectedRole = roles.find((role) => role._id === event.target.value);
                      setEditingRole(selectedRole?.name || "User");
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold cursor-pointer"
                  >
                    {roles.map(r => (
                      <option key={r._id} value={r._id}>{r.name}</option>
                    ))}
                  </select>
                  <div className={`mt-1 rounded-xl border p-3 ${editingRole === "Admin" ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}>
                    <div className="flex items-start gap-2">
                      {editingRole === "Admin" ? (
                        <Shield className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <UserCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className={`text-xs font-bold ${editingRole === "Admin" ? "text-green-800" : "text-blue-800"}`}>
                          {editingRole === "Admin" ? "ผู้อนุมัติการเข้าใช้ระบบ" : "ผู้ใช้งานทั่วไป"}
                        </p>
                        <p className={`text-[14px] leading-relaxed mt-1 ${editingRole === "Admin" ? "text-green-700" : "text-blue-700"}`}>
                          {editingRole === "Admin"
                            ? "ได้รับอีเมลคำขอเข้าสู่ระบบของ User ใหม่ และสามารถกดยืนยันหรือปฏิเสธคำขอได้"
                            : "เข้าใช้งานระบบได้ตามสิทธิ์ แต่จะไม่ได้รับอีเมลคำขออนุมัติ User ใหม่"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[15px] font-semibold rounded-xl flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" /> {modalError}
                  </div>
                )}
                <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 border-t border-slate-100 flex gap-3 bg-white shrink-0 pt-4 mt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    className="flex-grow border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-xs font-semibold disabled:opacity-50"
                    onClick={() => {
                      setEditModalOpen(false);
                      setEditingUser(null);
                    }}
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" disabled={submitting} className="flex-grow bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition-colors cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
