// scripts/seed-admin.mjs
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const { MONGO_URL, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = "Admin" } = process.env;

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["ADMIN", "USER"], default: "USER" },
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);

(async () => {
  if (!MONGO_URL) throw new Error("Falta MONGO_URL");
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("Faltan ADMIN_EMAIL/ADMIN_PASSWORD");

  await mongoose.connect(MONGO_URL);
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const updated = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    { name: ADMIN_NAME, password: hash, role: "ADMIN" },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  console.log("Admin listo:", { id: updated._id, email: updated.email, role: updated.role });
  await mongoose.disconnect();
  process.exit(0);
})();
