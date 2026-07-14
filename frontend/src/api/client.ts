import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export const TOKEN_KEY = "auth_token";
export const USER_KEY = "auth_user";

async function request<T = any>(
  path: string,
  options: { method?: string; body?: any; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = await storage.secureGet<string>(TOKEN_KEY, "");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message = (data && (data.detail || data.message)) || `Errore ${res.status}`;
    throw new Error(typeof message === "string" ? message : "Errore server");
  }
  return data as T;
}

export const api = {
  // Auth
  register: (payload: { email: string; password: string; name: string; admin_code?: string }) =>
    request<{ access_token: string; user: User }>("/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    }),
  login: (payload: { email: string; password: string }) =>
    request<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    }),
  me: () => request<User>("/auth/me"),

  // Settings
  getSettings: () => request<AppSettings>("/settings"),
  updateSettings: (s: AppSettings) => request<AppSettings>("/settings", { method: "PUT", body: s }),

  // Classes
  listClasses: () => request<ClassItem[]>("/classes"),
  createClass: (payload: ClassInput) => request<ClassItem>("/classes", { method: "POST", body: payload }),
  bulkCreateClasses: (payload: BulkClassInput) =>
    request<ClassItem[]>("/classes/bulk", { method: "POST", body: payload }),
  updateClass: (id: string, payload: Partial<ClassInput>) =>
    request<ClassItem>(`/classes/${id}`, { method: "PUT", body: payload }),
  deleteClass: (id: string) => request(`/classes/${id}`, { method: "DELETE" }),
  classBookings: (id: string) => request<Booking[]>(`/classes/${id}/bookings`),

  // Bookings
  createBooking: (class_id: string) =>
    request<Booking>("/bookings", { method: "POST", body: { class_id } }),
  myBookings: () => request<Booking[]>("/bookings/mine"),
  allBookings: () => request<Booking[]>("/bookings"),
  cancelBooking: (id: string) => request(`/bookings/${id}`, { method: "DELETE" }),
  attend: (id: string) =>
    request<{ ok: boolean; forfait_consumed: ForfaitConsumed | null }>(
      `/bookings/${id}/attend`,
      { method: "POST" },
    ),
  confirm: (id: string) => request(`/bookings/${id}/confirm`, { method: "POST" }),

  // Forfaits
  listClients: () => request<{ id: string; name: string; email: string }[]>("/users/clients"),
  updateUser: (id: string, payload: { name?: string; email?: string; password?: string }) =>
    request<User>(`/users/${id}`, { method: "PUT", body: payload }),
  deleteUser: (id: string) =>
    request<{ ok: boolean; deleted_bookings: number }>(`/users/${id}`, { method: "DELETE" }),
  listUncoveredBookings: () =>
    request<
      {
        user_id: string;
        user_name: string;
        user_email: string;
        count: number;
        bookings: {
          id: string;
          class_id: string;
          title: string;
          category: string;
          starts_at: string;
          status: string;
        }[];
      }[]
    >("/bookings/uncovered"),
  changeOwnPassword: (payload: { current_password: string; new_password: string }) =>
    request<{ ok: boolean }>("/auth/change-password", { method: "PUT", body: payload }),
  listForfaits: () => request<Forfait[]>("/forfaits"),
  myForfaits: () => request<Forfait[]>("/forfaits/mine"),
  createForfait: (payload: ForfaitInput) => request<Forfait>("/forfaits", { method: "POST", body: payload }),
  updateForfait: (id: string, payload: Partial<Forfait>) =>
    request<Forfait>(`/forfaits/${id}`, { method: "PUT", body: payload }),
  deleteForfait: (id: string) => request(`/forfaits/${id}`, { method: "DELETE" }),
};

// ---- Types ----
export type User = { id: string; email: string; name: string; role: "client" | "owner" };
export type BrandingColors = {
  background: string;
  primary: string;
  primaryHover: string;
  secondary: string;
  textPrimary: string;
  textSecondary: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  divider: string;
  success: string;
  error: string;
  warning: string;
};
export type BrandingImages = {
  loginHero: string;
  yoga: string;
  pilates: string;
  massage: string;
  faviconUrl: string;
  appIconUrl: string;
};
export type BrandingTexts = Record<string, string>;
export type AppSettings = {
  business_name: string;
  business_tagline: string;
  browser_title: string;
  allow_multiple_bookings: boolean;
  cancellation_window_hours: number;
  private_requires_confirmation: boolean;
  colors: BrandingColors;
  images: BrandingImages;
  texts: BrandingTexts;
};
export type ClassInput = {
  title: string;
  description?: string;
  category: string;
  kind: string;
  starts_at: string;
  duration_minutes: number;
  capacity: number;
  instructor?: string;
  image?: string;
};
export type ClassItem = ClassInput & {
  id: string;
  booked_count: number;
  description: string;
  instructor: string;
  image: string;
};
export type BulkClassInput = {
  title: string;
  description?: string;
  category: string;
  kind: string;
  duration_minutes: number;
  capacity: number;
  instructor?: string;
  image?: string;
  starts_at_list: string[];
};
export type ForfaitInput = {
  user_id: string;
  name: string;
  total_classes: number;
  category?: string | null;
  expires_at?: string | null;
};
export type Forfait = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  name: string;
  total_classes: number;
  remaining_classes: number;
  category?: string | null;
  expires_at?: string | null;
  active: boolean;
  created_at: string;
};
export type ForfaitConsumed = {
  id: string;
  name: string;
  remaining_after: number;
};
export type Booking = {
  id: string;
  class_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  status: "pending" | "confirmed" | "cancelled" | "attended";
  created_at: string;
  class_snapshot?: {
    title: string;
    category: string;
    kind: string;
    starts_at: string;
    duration_minutes: number;
    instructor: string;
  };
};
