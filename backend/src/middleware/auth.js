import jwt from "jsonwebtoken";
import User from "../features/users/user.model.js";

export const checkAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = "";

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Unauthenticated. Please log in." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super_secret");
    
    // Find User
    const user = await User.findById(decoded.userId).populate("role");
    if (!user) {
      return res.status(401).json({ message: "User not found or deleted." });
    }

    if (user.approvalStatus === "pending") {
      return res.status(403).json({
        code: "PENDING_APPROVAL",
        message: "First-login approval is required."
      });
    }

    if (user.approvalStatus === "rejected") {
      return res.status(403).json({
        code: "ACCESS_REJECTED",
        message: "Access request was rejected."
      });
    }

    req.user = user; // Attach user to request
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

export const checkAdmin = (req, res, next) => {
  if (req.user && req.user.role && req.user.role.name === "Admin") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied. Admin role required." });
  }
};
