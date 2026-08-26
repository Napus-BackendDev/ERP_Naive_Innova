import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../features/users/user.model.js";
import dotenv from "dotenv";
import { sendFirstLoginApproval } from "../features/auth/approvalEmail.js";
import { ensureSystemRoles, roleForEmail } from "../features/users/systemRoles.js";

dotenv.config();

const BLOCKED_GOOGLE_EMAILS = new Set([
  "info@naiveinnova.com",
  "naiveproducts@gmail.com"
]);

// Passport configuration with Google OAuth strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/google/callback`,
        scope: ["profile", "email"],
        proxy: true
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.trim().toLowerCase();
          if (!email) {
            return done(new Error("No email returned from Google"), null);
          }
          if (BLOCKED_GOOGLE_EMAILS.has(email)) {
            return done(null, { authBlockedReason: "personal_email_required" });
          }

          let user = await User.findOne({ email })
            .select("+approvalEmailSentAt")
            .populate("role");
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
            if (!user.role) {
              const expectedRole = await roleForEmail(email);
              user.role = expectedRole._id;
              modified = true;
            }
            if (modified) {
              await user.save();
              user = await User.findOne({ email })
                .select("+approvalEmailSentAt")
                .populate("role");
            }
          } else {
            const roles = await ensureSystemRoles();
            const roleDoc = roles.User;

            user = new User({
              googleId: profile.id,
              email: email,
              name: profile.displayName || "Google User",
              avatarUrl: profile.photos?.[0]?.value || "",
              role: roleDoc._id,
              approvalStatus: "pending"
            });
            await user.save();
            user.role = roleDoc; // Attach for the return done
          }

          if (
            user.approvalStatus === "rejected" &&
            (!user.rejectedUntil || user.rejectedUntil <= new Date())
          ) {
            user.approvalStatus = "pending";
            user.rejectedAt = undefined;
            user.rejectedUntil = undefined;
            await user.save();
          }

          if (user.approvalStatus === "pending") {
            // A first-login request never inherits or keeps elevated access.
            // Admin may promote the account only after approving it.
            const roles = await ensureSystemRoles();
            const currentRoleId = user.role?._id || user.role;
            if (String(currentRoleId || "") !== String(roles.User._id)) {
              user.role = roles.User._id;
              await user.save();
              user.role = roles.User;
            }
            try {
              await sendFirstLoginApproval(user);
            } catch (emailError) {
              // Email delivery must never turn an otherwise valid OAuth
              // callback into a raw 500 page. Keep access pending and let an
              // Admin review it from User Management while configuration is
              // corrected.
              console.error("Failed to send first-login approval email:", emailError.message);
              user.$locals.approvalEmailFailed = true;
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

export default passport;
