import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { respondToPrismaConnectionError } from "../utils/prismaErrors";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const userId = req.auth!.sub;
  let user;
  try {
    user = await prisma.user.findUnique({ where: { id: userId } });
  } catch (error) {
    if (respondToPrismaConnectionError(res, error)) return;
    throw error;
  }
  if (!user) return res.status(404).json({ message: "User not found" });

  return res.json({
    user: { id: user.id, name: user.name, email: user.email },
    auth: req.auth
  });
});

export default router;
