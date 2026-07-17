import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { AuthRole, AuthUser } from './jwt';

interface StoredUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: AuthRole;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

const dataDir = path.join(process.cwd(), 'data');
const usersPath = path.join(dataDir, 'users.json');

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function readUsers(): StoredUser[] {
  try {
    if (!fs.existsSync(usersPath)) return [];
    const raw = fs.readFileSync(usersPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  fs.mkdirSync(dataDir, { recursive: true });
  const tmp = `${usersPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2), 'utf8');
  fs.renameSync(tmp, usersPath);
}

function toAuthUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
  };
}

function getAdminFromEnv(): { email: string; password: string; name: string } | null {
  const email = normalizeEmail(process.env.ADMIN_EMAIL || '');
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password) return null;
  return {
    email,
    password,
    name: String(process.env.ADMIN_NAME || 'Admin SocialFlow').trim() || 'Admin SocialFlow',
  };
}

export function isRegisterAllowed(): boolean {
  const flag = String(process.env.ALLOW_REGISTER || '').toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;
  return process.env.NODE_ENV !== 'production';
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const normalized = normalizeEmail(email);
  if (!normalized || !password) return null;

  const admin = getAdminFromEnv();
  if (admin && admin.email === normalized && admin.password === password) {
    return {
      id: 'admin-env',
      email: admin.email,
      name: admin.name,
      phone: '',
      role: 'admin',
    };
  }

  const users = readUsers();
  const found = users.find((u) => u.email === normalized);
  if (!found) return null;

  const ok = await bcrypt.compare(password, found.passwordHash);
  return ok ? toAuthUser(found) : null;
}

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}): Promise<{ user: AuthUser } | { error: string; status: number }> {
  if (!isRegisterAllowed()) {
    return { error: 'Cadastro público desativado. Peça acesso ao administrador.', status: 403 };
  }

  const email = normalizeEmail(input.email);
  const name = String(input.name || '').trim();
  const password = String(input.password || '');
  const phone = String(input.phone || '').trim();

  if (!email || !name || password.length < 8) {
    return { error: 'Informe nome, e-mail e senha com pelo menos 8 caracteres.', status: 400 };
  }

  const admin = getAdminFromEnv();
  if (admin && admin.email === email) {
    return { error: 'Este e-mail já está em uso.', status: 409 };
  }

  const users = readUsers();
  if (users.some((u) => u.email === email)) {
    return { error: 'Este e-mail já está cadastrado.', status: 409 };
  }

  const now = new Date().toISOString();
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    name,
    phone,
    role: 'customer',
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: now,
    updatedAt: now,
  };

  try {
    writeUsers([...users, user]);
  } catch {
    return {
      error:
        'Não foi possível gravar o usuário neste ambiente. Configure ADMIN_EMAIL/ADMIN_PASSWORD ou um banco persistente.',
      status: 503,
    };
  }

  return { user: toAuthUser(user) };
}

export function findUserById(id: string): AuthUser | null {
  if (id === 'admin-env') {
    const admin = getAdminFromEnv();
    if (!admin) return null;
    return { id: 'admin-env', email: admin.email, name: admin.name, phone: '', role: 'admin' };
  }
  const found = readUsers().find((u) => u.id === id);
  return found ? toAuthUser(found) : null;
}
