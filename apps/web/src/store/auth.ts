import { useEffect } from 'react';
import { useAuth as useClerkAuth, useClerk } from '@clerk/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import { ApiError, api, getLocalToken, refreshLocalToken, setLocalToken } from '../lib/api';
import { clerkEnabled } from '../lib/clerk';
import type { User } from '../lib/types';

/**
 * Нэвтрэлт нь ПЛАТФОРМЫН хэмжээнд. Нэг удаа бүртгүүлээд бүх ресторанд хандана.
 * Ресторан бүр дэх профайл, эрх нь тухайн ресторанд анх хандахад үүснэ.
 *
 * Хоёр зам зэрэг ажиллана: и-мэйл + нууц үг (өөрийн JWT), эсвэл Clerk.
 */

/** Платформын данс — ресторанаас хамааралгүй. */
export type Account = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** Платформын админ — рестораны хүсэлтийг хянана. */
  isPlatformAdmin: boolean;
};

export const isStaff = (user: User | null | undefined) =>
  !!user && ['DIRECTOR', 'MANAGER', 'KITCHEN', 'DRIVER'].includes(user.role);

/**
 * Clerk тохируулаагүй үед түүний hook-ууд алдаа шиддэг (provider байхгүй).
 * `clerkEnabled` нь build-ийн үед тогтдог тул энд hook сонгох нь
 * дуудлагын дарааллыг өөрчлөхгүй — React-ийн дүрэм зөрчигдөхгүй.
 */
const useSignedIn = clerkEnabled
  ? useClerkAuth
  : () => ({ isLoaded: true, isSignedIn: false }) as { isLoaded: boolean; isSignedIn: boolean };

const useClerkSignOut = clerkEnabled
  ? () => useClerk().signOut
  : () => async (_opts?: { redirectUrl?: string }) => {};

// --- Өөрийн нэвтрэлтийн сесс -------------------------------------------------

type LocalAuth = {
  token: string | null;
  setToken: (token: string | null) => void;
};

/** Токеныг реактив байлгана — нэвтэрмэгц хуудсууд шинэчлэгдэнэ. */
export const useLocalAuth = create<LocalAuth>()((set) => ({
  token: getLocalToken(),
  setToken: (token) => {
    setLocalToken(token);
    set({ token });
  },
}));

type AuthResponse = { user: Account; accessToken: string };

export async function loginWithPassword(email: string, password: string) {
  const data = await api<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  useLocalAuth.getState().setToken(data.accessToken);
  return data.user;
}

export async function registerWithPassword(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  const data = await api<AuthResponse>('/auth/register', { method: 'POST', body: input });
  useLocalAuth.getState().setToken(data.accessToken);
  return data.user;
}

// --- Сесс уншигчид ----------------------------------------------------------

/**
 * Хүчингүй токеныг өөрөө цэвэрлэнэ.
 *
 * 401 = токен таарахгүй (хугацаа дууссан, эсвэл гарсны дараа үлдсэн).
 * 403 бол өөр — токен хүчинтэй, зүгээр л эрх хүрэхгүй. Түүнийг цэвэрлэхгүй.
 */
function useClearStaleToken(error: unknown) {
  const token = useLocalAuth((s) => s.token);
  const setToken = useLocalAuth((s) => s.setToken);

  useEffect(() => {
    if (token && error instanceof ApiError && error.status === 401) setToken(null);
  }, [error, token, setToken]);
}

/** Платформын сесс — нэвтэрсэн эсэх. Ресторан хамаарахгүй. */
export function useAccount() {
  const { isLoaded, isSignedIn: clerkSignedIn } = useSignedIn();
  const localToken = useLocalAuth((s) => s.token);
  const signedIn = !!localToken || !!clerkSignedIn;

  const query = useQuery({
    queryKey: ['account', localToken ? 'local' : 'clerk'],
    queryFn: () => api<{ user: Account }>('/auth/me'),
    enabled: (isLoaded || !!localToken) && signedIn,
    retry: false,
    staleTime: 60_000,
  });

  useClearStaleToken(query.error);

  return {
    account: query.data?.user ?? null,
    ready: (isLoaded || !!localToken) && !query.isLoading,
    isSignedIn: signedIn,
    error: query.error instanceof ApiError ? query.error : null,
  };
}

/** Storefront: идэвхтэй рестораны профайл. Анх хандахад сервер дээр үүснэ. */
export function useMember(slug?: string) {
  const { isSignedIn, ready: accountReady } = useAccount();

  const query = useQuery({
    queryKey: ['membership', slug],
    queryFn: () => api<{ user: User }>('/auth/membership'),
    enabled: accountReady && isSignedIn && !!slug,
    retry: false,
    staleTime: 60_000,
  });

  useClearStaleToken(query.error);

  return {
    user: query.data?.user ?? null,
    ready: accountReady && !query.isLoading,
    isSignedIn,
    error: query.error instanceof ApiError ? query.error : null,
  };
}

/** Dashboard: ажилтны гишүүнчлэл. Эрхгүй бол user null хэвээр (403). */
export function useStaffMember() {
  const { isSignedIn, ready: accountReady } = useAccount();

  const query = useQuery({
    queryKey: ['staff-me'],
    queryFn: () => api<{ user: User }>('/auth/staff'),
    enabled: accountReady && isSignedIn,
    // 403 = эрхгүй. Дахин оролдох нь утгагүй.
    retry: false,
    staleTime: 60_000,
  });

  useClearStaleToken(query.error);

  return {
    user: query.data?.user ?? null,
    ready: accountReady && !query.isLoading,
    isSignedIn,
    error: query.error instanceof ApiError ? query.error : null,
  };
}

/** Аль замаар нэвтэрсэн ч ажилладаг гарах үйлдэл. */
export function useSignOut() {
  const clerkSignOut = useClerkSignOut();
  const setToken = useLocalAuth((s) => s.setToken);
  const queryClient = useQueryClient();

  return async (opts?: { redirectUrl?: string }) => {
    if (getLocalToken()) {
      // Сервер дээр tokenVersion ахиж, хуучин токенууд хүчингүй болно.
      await api('/auth/logout', { method: 'POST' }).catch(() => {});
      setToken(null);
      queryClient.clear();
      if (opts?.redirectUrl) window.location.assign(opts.redirectUrl);
      return;
    }
    queryClient.clear();
    await clerkSignOut(opts);
  };
}

/** Хуудас сэргээхэд өөрийн сессийг refresh cookie-гоор сэргээнэ. */
export async function restoreLocalSession() {
  if (getLocalToken()) return;
  if (await refreshLocalToken()) useLocalAuth.getState().setToken(getLocalToken());
}
