import { Router } from 'express';

export function createAuthRoutes(authService) {
  const router = Router();
  router.post('/login', async (request, response) => {
    try {
      response.json(await authService.login(request.body.username, request.body.password));
    } catch (error) {
      response.status(401).json({ error: error.message });
    }
  });
  return router;
}