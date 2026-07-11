import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client BEFORE importing auth.js
const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    updateUser: vi.fn(),
  },
};

vi.mock('../supabase.js', () => ({ supabase: mockSupabase }));

const auth = await import('../auth.js');

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signUpWithEmail', () => {
    it('returns user on success', async () => {
      const fakeUser = { id: 'user-123', email: 'a@b.com' };
      mockSupabase.auth.signUp.mockResolvedValue({ data: { user: fakeUser }, error: null });

      const result = await auth.signUpWithEmail('a@b.com', 'password123');

      expect(result.user).toEqual(fakeUser);
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
        email: 'a@b.com',
        password: 'password123',
      }));
    });

    it('flags needsConfirmation when signUp returns no session (email confirmations ON)', async () => {
      const fakeUser = { id: 'user-123', email: 'a@b.com' };
      mockSupabase.auth.signUp.mockResolvedValue({ data: { user: fakeUser, session: null }, error: null });

      const result = await auth.signUpWithEmail('a@b.com', 'password123');

      expect(result.needsConfirmation).toBe(true);
      expect(result.user).toEqual(fakeUser);
      expect(result.error).toBeNull();
    });

    it('does not flag needsConfirmation when a session is returned immediately', async () => {
      const fakeUser = { id: 'user-123', email: 'a@b.com' };
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: fakeUser, session: { access_token: 'tok' } },
        error: null,
      });

      const result = await auth.signUpWithEmail('a@b.com', 'password123');

      expect(result.needsConfirmation).toBe(false);
      expect(result.user).toEqual(fakeUser);
    });

    it('returns error message on failure', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already registered' },
      });

      const result = await auth.signUpWithEmail('a@b.com', 'password123');

      expect(result.user).toBeNull();
      expect(result.error).toBe('Email already registered');
    });
  });

  describe('signInWithEmail', () => {
    it('returns user on success', async () => {
      const fakeUser = { id: 'user-123', email: 'a@b.com' };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: fakeUser }, error: null });

      const result = await auth.signInWithEmail('a@b.com', 'password123');

      expect(result.user).toEqual(fakeUser);
      expect(result.error).toBeNull();
    });

    it('returns error on bad credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await auth.signInWithEmail('a@b.com', 'wrong');
      expect(result.error).toBe('Invalid login credentials');
    });
  });

  describe('signOut', () => {
    it('calls supabase signOut', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      const result = await auth.signOut();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });
  });

  describe('getSession', () => {
    it('returns session when present', async () => {
      const fakeSession = { user: { id: 'user-123' }, access_token: 'tok' };
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: fakeSession }, error: null });

      const result = await auth.getSession();
      expect(result.session).toEqual(fakeSession);
    });

    it('returns null session when not logged in', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
      const result = await auth.getSession();
      expect(result.session).toBeNull();
    });
  });

  describe('updateUserTier / tierFromUser', () => {
    it('stamps tier and code into user metadata', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const { user, error } = await auth.updateUserTier('pro', 'ADONIS2026');
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ data: { tier: 'pro', access_code: 'ADONIS2026' } });
      expect(user).toEqual({ id: 'u1' });
      expect(error).toBeNull();
    });
    it('tierFromUser reads metadata and defaults to free', () => {
      expect(auth.tierFromUser({ user_metadata: { tier: 'elite' } })).toBe('elite');
      expect(auth.tierFromUser({ user_metadata: { tier: 'hacker' } })).toBe('free');
      expect(auth.tierFromUser(null)).toBe('free');
    });
  });
});
