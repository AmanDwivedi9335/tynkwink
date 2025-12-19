import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const userId = req.auth!.sub;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ message: "User not found" });

  return res.json({
    user: { id: user.id, name: user.name, email: user.email },
    auth: req.auth
  });
});

export default router;
