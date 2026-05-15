// lib/admin-users.js
// Named admin users. Adding a user = add a row + add an env var for their password.
// To rotate a password: change the env var on Vercel + .env.local, redeploy.

export const ADMIN_USERS = [
  {
    email: 'jorrelpatterson@gmail.com',
    password: process.env.ADMIN_PASSWORD,
    role: 'admin',
    name: 'Jorrel',
  },
  {
    email: 'mika@ascnd.pro',
    password: process.env.VA_PASSWORD,
    role: 'va',
    name: 'Mika',
  },
];

export function findUserByCredentials(email, password) {
  if (!email || !password) return null;
  const normalized = String(email).trim().toLowerCase();
  const user = ADMIN_USERS.find(u => u.email.toLowerCase() === normalized);
  if (!user) return null;
  if (!user.password) return null; // env var unset
  if (user.password !== password) return null;
  return { email: user.email, role: user.role, name: user.name };
}

export function findUserByEmail(email) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  const user = ADMIN_USERS.find(u => u.email.toLowerCase() === normalized);
  return user ? { email: user.email, role: user.role, name: user.name } : null;
}
