import Role from "./role.model.js";

const ROLE_DEFINITIONS = {
  Admin: {
    description: "ผู้ใช้งานระบบที่รับและตัดสินคำขอเข้าใช้ครั้งแรก",
    permissions: ["manage_users", "approve_first_login"]
  },
  User: {
    description: "ผู้ใช้งานระบบทั่วไป",
    permissions: []
  }
};

export async function ensureSystemRoles() {
  const roles = {};
  for (const [name, definition] of Object.entries(ROLE_DEFINITIONS)) {
    roles[name] = await Role.findOneAndUpdate(
      { name },
      { $set: definition },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }
  return roles;
}

export async function roleForEmail() {
  const roles = await ensureSystemRoles();
  // Email notification recipients are not automatic Admin accounts. Every
  // created/re-created account starts as User; only an existing Admin may
  // promote it later through User Management.
  return roles.User;
}

export async function syncSystemUserRoles() {
  // Kept for compatibility with older startup scripts. Never overwrite
  // manually assigned roles from an email allowlist.
  return ensureSystemRoles();
}
