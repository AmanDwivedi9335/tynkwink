import jwt from "jsonwebtoken";

export type JwtPayload = {
    sub: string;
    role: "SUPERADMIN" | "TENANT_ADMIN" | "SALES_ADMIN" | "SALES_EXECUTIVE";
    tenantId?: string | null;
}

const accessSecret = process.env.JWT_ACCESS_SECRET!;
const refreshSecret = process.env.JWT_REFRESH_SECRET ?? accessSecret;

export function signAccessToken(payload: JwtPayload, ttlMinutes: number){
    return jwt.sign(payload, accessSecret, {expiresIn: `${ttlMinutes}m`});
}

export function signRefreshToken(payload: JwtPayload, ttlDays: number){
    return jwt.sign(payload, refreshSecret, {expiresIn: `${ttlDays}d`});
}

export function verifyAccessToken(token: string){
    return jwt.verify(token, accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string){
    return jwt.verify(token, refreshSecret) as JwtPayload;
}
