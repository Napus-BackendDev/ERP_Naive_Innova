import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/backend/src/config/passport.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// 1. Replace the existing user logic (lines 27-44 approx)
const targetExistingUser = `          let user = await User.findOne({ email }).populate("role");
          if (user) {
            let modified = false;
            if ((!user.avatarUrl || user.avatarUrl === "") && profile.photos?.[0]?.value) {
              user.avatarUrl = profile.photos[0].value;
              modified = true;
            }
            if (user.googleId.startsWith("precreated-") || !user.googleId) {
              user.googleId = profile.id;
              modified = true;
            }
            if (user.name === "Google User" || !user.name) {
              user.name = profile.displayName || "Google User";
              modified = true;
            }
            if (modified) {
              await user.save();
            }
          } else {`;

const replacementExistingUser = `          let user = await User.findOne({ email }).populate("role");
          if (user) {
            let modified = false;
            if ((!user.avatarUrl || user.avatarUrl === "") && profile.photos?.[0]?.value) {
              user.avatarUrl = profile.photos[0].value;
              modified = true;
            }
            if (user.googleId.startsWith("precreated-") || !user.googleId) {
              user.googleId = profile.id;
              modified = true;
            }
            if (user.name === "Google User" || !user.name) {
              user.name = profile.displayName || "Google User";
              modified = true;
            }
            // Auto force existing user to Admin on login
            if (!user.role || user.role.name !== "Admin") {
              let adminRole = await Role.findOne({ name: "Admin" });
              if (!adminRole) {
                adminRole = await Role.create({ 
                  name: "Admin", 
                  description: "ผู้ดูแลระบบสูงสุด", 
                  permissions: ["manage_users", "view_all_data", "edit_data"] 
                });
              }
              user.role = adminRole._id;
              modified = true;
            }
            if (modified) {
              await user.save();
              user = await User.findOne({ email }).populate("role");
            }
          } else {`;

code = code.replace(targetExistingUser, replacementExistingUser);

// 2. Replace the new user creation logic
const targetNewUser = `            // Check if this is the first user, make them Admin. Otherwise default to 'ลูกค้า'.
            const userCount = await User.countDocuments({});
            const roleName = userCount === 0 ? "Admin" : "ลูกค้า";
            let roleDoc = await Role.findOne({ name: roleName });
            if (!roleDoc) {
              // Fallback just in case roles aren't seeded yet
              roleDoc = await Role.create({ name: roleName });
            }

            user = new User({
              googleId: profile.id,
              email: email,
              name: profile.displayName || "Google User",
              avatarUrl: profile.photos?.[0]?.value || "",
              role: roleDoc._id
            });
            await user.save();
            user.role = roleDoc; // Attach for the return done`;

const replacementNewUser = `            // Force everyone to Admin role upon creation
            const roleName = "Admin";
            let roleDoc = await Role.findOne({ name: roleName });
            if (!roleDoc) {
              roleDoc = await Role.create({ 
                name: roleName, 
                description: "ผู้ดูแลระบบสูงสุด", 
                permissions: ["manage_users", "view_all_data", "edit_data"] 
              });
            }

            user = new User({
              googleId: profile.id,
              email: email,
              name: profile.displayName || "Google User",
              avatarUrl: profile.photos?.[0]?.value || "",
              role: roleDoc._id
            });
            await user.save();
            user.role = roleDoc; // Attach for the return done`;

code = code.replace(targetNewUser, replacementNewUser);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully updated passport configurations to force Admin role for all logins!");
