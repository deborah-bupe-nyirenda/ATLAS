import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function createAuthService(store, secret) {
  return {
    async login(username, password) {
      const user = await store.findUserByUsername(username);
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new Error('Invalid credentials');
      return {
        token: jwt.sign({ sub: user.userId, username: user.username, role: user.role }, secret, { expiresIn: '8h' }),
        user: { userId: user.userId, username: user.username, role: user.role }
      };
    },
    verify(token) {
      return jwt.verify(token, secret);
    }
  };
}