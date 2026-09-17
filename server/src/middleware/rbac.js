export function requireRole(authService, ...allowedRoles) {
  return (request, response, next) => {
    const authorization = request.headers.authorization ?? '';
    if (!authorization.startsWith('Bearer ')) {
      return response.status(401).json({ error: 'Authentication required' });
    }
    try {
      const user = authService.verify(authorization.slice(7));
      if (!allowedRoles.includes(user.role)) return response.status(403).json({ error: 'This operation requires an authorized role' });
      request.user = user;
      return next();
    } catch {
      return response.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}