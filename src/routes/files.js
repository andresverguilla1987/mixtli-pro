import express from "express";
import { createPresign, downloadLink, listFiles } from "../controllers/filesController.js";

const router = express.Router();

router.post("/presign", createPresign);
router.get("/", listFiles);
router.get("/:key/download", downloadLink);

export default router;
