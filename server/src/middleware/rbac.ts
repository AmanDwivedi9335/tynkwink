import {Request, Response, NextFunction} from 'express';
import { UserRole } from "@prisma/client";

export function requireRole(allowed: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const role = req.auth?.role as UserRole | undefined;
        if(!role) return res.status(401).json({message: "Unauthenticated"});
        if(!allowed.includes(role)) return res.status(403).json({message: "Forbidden"});
        next();
    };
}

export function requireTenantContext(req: Request, res: Response, next: NextFunction) {
    const role = req.auth?.role;
    const tenantId = req.auth?.tenantId;

    if(role === "SUPERADMIN") return next();
    if(!tenantId) return res.status(400).json({message: "Missing Tenant Context"});
    next();
}
