import { Router } from "express";
import os from 'os';

const router = Router();

router.get('/api/debug', (req, res) => {
  res.json({
    cwd: process.cwd(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    uptime: process.uptime(),
    envKeys: Object.keys(process.env)
  });
});

// // ✅ Add a dev-only delay route
router.get("/api/wait/:seconds", async (req, res) => {
  const seconds = parseInt(req.params.seconds, 10);

  if (isNaN(seconds) || seconds < 0 || seconds > 300) {
    res.status(400).json({ error: "Invalid wait time (0–300 allowed)" });
    return;
  }

  console.log(`[DEBUG] Waiting ${seconds}s`);
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));

  res.status(200).json({ message: `Waited ${seconds} seconds` });
});

export default router;
