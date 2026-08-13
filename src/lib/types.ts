// Tipe data untuk user di Firestore.
export type UserRecord = {
  id: string;
  email: string | null;
  isGuest?: boolean;
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
  // lokasi presisi + alamat
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null; // meter (GPS)
  address?: string | null; // alamat dari reverse geocode
  city?: string | null;
  postal?: string | null;
  // perangkat
  deviceId?: string | null; // fingerprint hash
  device?: string | null; // nama perangkat (iPhone, Android Phone, dsb)
  os?: string | null;
  browser?: string | null;
  deviceType?: string | null; // mobile / tablet / desktop
  screen?: string | null; // "1920x1080"
  language?: string | null;
  userAgent?: string | null;
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
