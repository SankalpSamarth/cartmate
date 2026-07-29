const DEVICE_ID_KEY = "cartmate_device_id";
const MY_POST_KEY = "cartmate_my_post";

/** Returns a stable device_id, generating one on first call and persisting it. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export interface StoredPost {
  id: string;
  device_id: string;
  expires_at: string;
  platform: string;
  hostel: string;
}

/** Persist the user's own post reference after creating one. */
export function saveMyPost(post: StoredPost): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MY_POST_KEY, JSON.stringify(post));
}

/** Retrieve the user's own post reference (or null if none / expired). */
export function getMyPost(): StoredPost | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(MY_POST_KEY);
  if (!raw) return null;
  try {
    const post: StoredPost = JSON.parse(raw);
    // Clear if expired
    if (new Date(post.expires_at) < new Date()) {
      clearMyPost();
      return null;
    }
    return post;
  } catch {
    return null;
  }
}

/** Remove the user's own post reference from storage. */
export function clearMyPost(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MY_POST_KEY);
}
