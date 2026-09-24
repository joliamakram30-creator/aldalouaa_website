const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const {
  isValidEmail,
  normalizeEgyptPhone,
  cleanText,
} = require("../utils/helpers");

const MIN_PASSWORD_LENGTH = 8;

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  passwordSet: user.passwordSet,
  createdAt: user.createdAt,
});

const signToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

// ==============================
// REGISTER
// ==============================

const register = async (req, res) => {
  try {
    const name = cleanText(req.body.name, 100);
    const email = cleanText(req.body.email, 190).toLowerCase();
    const password = String(req.body.password || "");
    const rawPhone = cleanText(req.body.phone, 30);

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (password.length < MIN_PASSWORD_LENGTH || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: `Password must be between ${MIN_PASSWORD_LENGTH} and 72 characters`,
      });
    }

    let phone = null;
    if (rawPhone) {
      phone = normalizeEgyptPhone(rawPhone);
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid Egyptian mobile number (01XXXXXXXXX)",
        });
      }
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, phone },
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    // Two simultaneous registrations with the same email.
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    console.error("Register Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==============================
// LOGIN
// ==============================

const login = async (req, res) => {
  try {
    const email = cleanText(req.body.email, 190).toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Same message for "no such user" and "wrong password".
    const passwordMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    res.json({
      success: true,
      message: "Login successful",
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==============================
// LOGIN / SIGN UP WITH GOOGLE
// ==============================
// The browser gets a signed "ID token" from Google and sends it here. We verify
// it with Google's public keys (signature, expiry and that it was issued for OUR
// client id), then log in - or create - the account with that verified email.

let googleClient;
const getGoogleClient = () => {
  if (!googleClient) googleClient = new OAuth2Client();
  return googleClient;
};

const googleLogin = async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return res.status(503).json({
        success: false,
        message: "Google sign-in is not configured on this store",
      });
    }

    const credential = String(req.body.credential || "");

    if (!credential) {
      return res.status(400).json({ success: false, message: "Google credential is required" });
    }

    let payload;
    try {
      const ticket = await getGoogleClient().verifyIdToken({ idToken: credential, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({
        success: false,
        message: "Google sign-in failed. Please try again",
      });
    }

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({
        success: false,
        message: "Your Google email address is not verified",
      });
    }

    const email = String(payload.email).toLowerCase();
    const googleId = String(payload.sub);

    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      const sameEmail = await prisma.user.findUnique({ where: { email } });

      if (sameEmail) {
        if (sameEmail.googleId && sameEmail.googleId !== googleId) {
          return res.status(401).json({
            success: false,
            message: "Google sign-in failed. Please try again",
          });
        }
        // Existing account with the same (Google-verified) email: link it.
        user = await prisma.user.update({ where: { id: sameEmail.id }, data: { googleId } });
      } else {
        try {
          user = await prisma.user.create({
            data: {
              name: cleanText(payload.name || email.split("@")[0], 100) || "Customer",
              email,
              googleId,
              passwordSet: false,
              // nobody knows this password - the customer can set her own from her profile
              password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
            },
          });
        } catch (error) {
          if (error.code !== "P2002") throw error;
          user = await prisma.user.findUnique({ where: { email } });
        }
      }
    }

    res.json({
      success: true,
      message: "Login successful",
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==============================
// CURRENT USER
// ==============================

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    console.error("Get Me Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateMe = async (req, res) => {
  try {
    const data = {};

    if (req.body.name !== undefined) {
      const name = cleanText(req.body.name, 100);
      if (!name) {
        return res.status(400).json({ success: false, message: "Name cannot be empty" });
      }
      data.name = name;
    }

    if (req.body.phone !== undefined) {
      const rawPhone = cleanText(req.body.phone, 30);
      if (rawPhone) {
        const phone = normalizeEgyptPhone(rawPhone);
        if (!phone) {
          return res.status(400).json({
            success: false,
            message: "Please enter a valid Egyptian mobile number (01XXXXXXXXX)",
          });
        }
        data.phone = phone;
      } else {
        data.phone = null;
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Update Me Error:", error);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

const changePassword = async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Accounts created with Google have no password yet, so they may just set one.
    if (!newPassword || (user.passwordSet && !currentPassword)) {
      return res.status(400).json({
        success: false,
        message: "Current and new password are required",
      });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > 72) {
      return res.status(400).json({
        success: false,
        message: `Password must be between ${MIN_PASSWORD_LENGTH} and 72 characters`,
      });
    }

    if (user.passwordSet && !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 10), passwordSet: true },
    });

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({ success: false, message: "Failed to update password" });
  }
};

module.exports = { register, login, googleLogin, getMe, updateMe, changePassword };
