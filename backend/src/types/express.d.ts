// Розширення Express Request: requireAuth кладе сюди id автентифікованого користувача.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
