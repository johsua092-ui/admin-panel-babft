// Tipe data untuk user di Firestore.
// Nama field mengikuti skema yang diharapkan — sesuaikan dengan koleksimu
// (dijelaskan lengkap di README / docs/SCHEMA.md).
export type UserRecord = {
  id: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  // login / online
  lastLoginAt?: number | null; // epoch ms
  loginCount?: number;
  online?: boolean;
  lastOnlineAt?: number | null; // epoch ms
  firstLoginAt?: number | null;
  // geo / network
  region?: string | null; // negara / region
  countryCode?: string | null; // ISO 3166-1 alpha-2
  timezone?: string | null;
  ipAddress?: string | null;
  // vpn detection
  previousRegion?: string | null;
  regionChangedAt?: number | null;
  regionChangeCount?: number;
  flaggedAsVpn?: boolean;
  // meta
  createdAt?: number | null;
  updatedAt?: number | null;
};

// Provider login yang mungkin terekam
export type AuthProvider = "google.com" | "password" | "unknown";
