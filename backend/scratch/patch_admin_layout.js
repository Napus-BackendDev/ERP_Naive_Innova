import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/app/admin/layout.js';
let code = fs.readFileSync(path, 'utf8');

// Update imports to include usePathname
const oldImports = `import { useRouter } from "next/navigation";`;
const newImports = `import { useRouter, usePathname } from "next/navigation";`;

code = code.replace(oldImports, newImports);

// Update AdminLayout component
const oldComponent = `export default function AdminLayout({ children }) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (!token || !storedUser) {
      router.push("/login");
    }
  }, [router]);

  return <DashboardLayout>{children}</DashboardLayout>;
}`;

const newComponent = `export default function AdminLayout({ children }) {
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
}`;

code = code.replace(oldComponent, newComponent);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully updated admin layout.js to bypass DashboardLayout for kanban!");
