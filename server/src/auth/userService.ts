import { v4 as uuidv4 } from 'uuid';
import UserModel from '../models/user';
import { hashPassword, toAuthUser, verifyPassword } from './token';
import { AuthUser, ReputationLevel } from '../types';
import type { GoogleProfile } from './googleOAuth';

function newUserId(): string {
  return `usr_${uuidv4().slice(0, 8)}`;
}

const defaultAvatar =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

type UserLean = AuthUser & {
  passwordHash?: string;
  googleId?: string;
};

export async function findUserById(userId: string): Promise<UserLean | null> {
  const doc = await UserModel.findOne({ id: userId }).lean();
  return doc as UserLean | null;
}

export async function registerLocalUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<{ user: AuthUser; userId: string }> {
  const existing = await UserModel.findOne({ email: input.email });
  if (existing) {
    const err = new Error('E-mail já cadastrado') as Error & { status: number };
    err.status = 409;
    throw err;
  }

  const id = newUserId();
  const userDoc = {
    id,
    email: input.email,
    passwordHash: hashPassword(input.password),
    name: input.name,
    avatarUrl: defaultAvatar,
    isAdmin: false,
    role: 'user' as const,
    reputationLevel: 'Novo' as ReputationLevel,
    trustworthinessScore: 50,
  };

  await UserModel.create(userDoc);
  return { user: toAuthUser(userDoc), userId: id };
}

export async function loginLocalUser(
  email: string,
  password: string
): Promise<{ user: AuthUser; userId: string } | null> {
  const doc = await UserModel.findOne({ email }).lean();
  if (!doc?.passwordHash) return null;
  if (!verifyPassword(password, String(doc.passwordHash))) return null;
  return {
    user: toAuthUser(doc as UserLean),
    userId: String(doc.id),
  };
}

/** Encontra ou cria usuário a partir do Google; evita duplicatas por googleId ou e-mail. */
export async function findOrCreateGoogleUser(profile: GoogleProfile): Promise<{
  user: AuthUser;
  userId: string;
  isNew: boolean;
}> {
  let doc = await UserModel.findOne({ googleId: profile.googleId }).lean();
  if (doc) {
    const updates: Record<string, string> = {};
    if (profile.avatarUrl && profile.avatarUrl !== doc.avatarUrl) {
      updates.avatarUrl = profile.avatarUrl;
    }
    if (profile.name && profile.name !== doc.name) {
      updates.name = profile.name;
    }
    if (Object.keys(updates).length > 0) {
      await UserModel.updateOne({ id: doc.id }, { $set: updates });
      doc = { ...doc, ...updates };
    }
    return {
      user: toAuthUser(doc as UserLean),
      userId: String(doc.id),
      isNew: false,
    };
  }

  doc = await UserModel.findOne({ email: profile.email }).lean();
  if (doc) {
    await UserModel.updateOne(
      { id: doc.id },
      {
        $set: {
          googleId: profile.googleId,
          ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
          ...(profile.name ? { name: profile.name } : {}),
        },
      }
    );
    const merged = {
      ...doc,
      googleId: profile.googleId,
      avatarUrl: profile.avatarUrl || doc.avatarUrl,
      name: profile.name || doc.name,
    };
    return {
      user: toAuthUser(merged as UserLean),
      userId: String(doc.id),
      isNew: false,
    };
  }

  const id = newUserId();
  const userDoc = {
    id,
    email: profile.email,
    googleId: profile.googleId,
    name: profile.name,
    avatarUrl: profile.avatarUrl || defaultAvatar,
    isAdmin: false,
    role: 'user' as const,
    reputationLevel: 'Novo' as ReputationLevel,
    trustworthinessScore: 50,
  };

  await UserModel.create(userDoc);
  return {
    user: toAuthUser(userDoc),
    userId: id,
    isNew: true,
  };
}
