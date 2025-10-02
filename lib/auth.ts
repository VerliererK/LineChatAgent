import { CONFIG } from "../utils/config";

export const validateAuth = (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  return token === CONFIG.AUTH_KEY;
}
