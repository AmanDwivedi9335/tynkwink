import { Router } from "express";
import {z} from "zod";
import crypto, { sign } from "crypto";
import { prisma } from "../prisma";
import { verifyPassword } from "../utils/crypto";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { access } from "fs";

const router = Router();

const loginSchema = z.object({
    email:z.email(),
    password:z.string().min(6),
    tenantId:z.string().optional() //optional; required if users belong to tenants
});

function sha256(input: string) {
    return crypto.createHash("sha256").update(input).digest("hex");
}

router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({message: "Invalid Input", errors: z.treeifyError(parsed.error)});
    
    const {email, password, tenantId} = parsed.data;

    const user = await prisma.user.findUnique({
        where: {email},
        include: {memberships: {include: {tenant: true}}}
    });

    if (!user || !user.isActive) return res.status(401).json({message: "Invalid Credentials"});

    const ok = await verifyPassword(password, user.passwordHash);
    if(!ok) return res.status(401).json({message: "Invalid Credentials"});

    const isSuperAdmin = user.memberships.length === 0;

    const accessTlt = Number(process.env.ACCESS_TOKEN_TTL_MIN) || 15;
    const refreshTlt = Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30;

    if(isSuperAdmin) {
        const payload = { sub: user.id, role: "SUPERADMIN" as const, tenantId: null };
        const accessToken = signAccessToken(payload, accessTlt);
        const refreshToken = signRefreshToken(payload, refreshTlt);

        await prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: sha256(refreshToken),
                expiresAt: new Date(Date.now() + refreshTlt * 86400000)
            }
        });

        return res.json({ 
            accessToken,
            refreshToken,
            user: { id: user.id, name: user.name, email: user.email },
            role: "SUPERADMIN",
            activeTenant: null,
            tenants: [],
            redirectTo: "/superadmin/dashboard"
        });
    }  

    //for tenant users: choosing active tenant
    const memberships = user.memberships.filter(m=> m.isActive && m.tenant.isActive);

    if(memberships.length === 0) return res.status(403).json({message: "No Active Tenant Memberships Found"});

    let active = memberships[0]!;
    if (memberships.length > 1) {
        if(!tenantId){
            //Asking frontend to specify tenant
            return res.status(200).json({
                requiresTenantSelection: true,
                tenants: memberships.map(m=> ({ tenantId: m.tenantId, tenantName: m.tenant.name, role: m.role  }))
            });
        }
        const chosen = memberships.find(m => m.tenantId === tenantId);
        if(!chosen) return res.status(403).json({ message: "Invalid Tenant Selection" });
        active = chosen;
    }

    const payload = {sub: user.id, role: active.role, tenantId: active.tenantId };
    const accessToken = signAccessToken(payload, accessTlt);
    const refreshToken = signRefreshToken(payload, refreshTlt);

    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            tokenHash: sha256(refreshToken),
            expiresAt: new Date(Date.now() + refreshTlt * 86400000)
        }
    });

    const redirectTo = 
        active.role === "TENANT_ADMIN" ? "/app" :
        active.role === "SALES_ADMIN" ? "/sales-admin" :
        "/sales";
    
    return res.json({
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email },
        role: active.role,
        activeTenant: { tenantId: active.tenantId, tenantName: active.tenant.name },
        tenants: memberships.map(m=> ({ tenantId: m.tenantId, tenantName: m.tenant.name, role: m.role  })),
        redirectTo
    });
});

router.post ("/refresh-token", async(req, res) => {
    const token = req.body?.refreshToken as string | undefined;
    if(!token) return res.status(400).json({message: "Missing Refresh Token"});

    try{
        const payload = verifyRefreshToken(token);
        const tokenHash = sha256(token);

        const stored = await prisma.refreshToken.findFirst({
            where: { userId: payload.sub, tokenHash, revokedAt: null }
        });

        if(!stored) return res.status(401).json({ message: "Refresh Token Revoked/invalid" });
        if(stored.expiresAt.getTime() < Date.now()) return res.status(401).json({message: "Refresh Token Expired"});

        //Rotate refresh token 
        await prisma.refreshToken.update({
            where: { id: stored.id },
            data: { revokedAt: new Date() }
        });

        const accessTtl = Number(process.env.ACCESS_TOKEN_TTL_MIN ?? 15);
        const refreshTtl = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);

        const newAccess = signAccessToken(payload, accessTtl);
        const newRefresh = signRefreshToken(payload, refreshTtl);

        await prisma.refreshToken.create({
            data: {
                userId: payload.sub,
                tokenHash: sha256(newRefresh),
                expiresAt: new Date(Date.now() + refreshTtl * 86400000)
            }
        });
        return res.json({ accessToken: newAccess, refreshToken: newRefresh });
    } catch {
        return res.status(401).json({message: "Invalid or Expired Refresh Token"});
    }
});

export default router;