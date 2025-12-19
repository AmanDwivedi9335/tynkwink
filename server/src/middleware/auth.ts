import {Request, Response, NextFunction} from "express";
import { verifyAccessToken, JwtPayload } from "../utils/jwt";

declare global {
    namespace Express {
        interface Request {
            auth?: JwtPayload;
        }
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if(!token) return res.status(401).json({message: "Missing Access Token"});

        try{
            req.auth = verifyAccessToken(token);
            return next();
        } catch {
            return res.status(401).json({message: "Invalid or Expired Access Token"});
        }
    
}
