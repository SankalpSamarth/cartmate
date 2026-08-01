/** localStorage key for all outgoing join requests this device has sent. */
const MY_REQUESTS_KEY = "cartmate_my_requests";

export interface LocalRequest {
  id: string;
  order_id: string;
  status: "pending" | "approved" | "declined" | "withdrawn";
  requester_name: string | null;
  note: string;
}

type RequestsMap = Record<string, LocalRequest>; // keyed by order_id

function load(): RequestsMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(MY_REQUESTS_KEY) || "{}");
  } catch {
    return {};
  }
}

function save(map: RequestsMap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MY_REQUESTS_KEY, JSON.stringify(map));
}

/** Get the LocalRequest for a given order_id (or null if none sent). */
export function getRequestForOrder(orderId: string): LocalRequest | null {
  return load()[orderId] ?? null;
}

/** Get all stored requests (for initialising hook state). */
export function getAllRequests(): RequestsMap {
  return load();
}

/** Persist a newly sent request. */
export function saveMyRequest(req: LocalRequest): void {
  const map = load();
  map[req.order_id] = req;
  save(map);
}

/** Remove a request entirely from localStorage (used after withdraw). */
export function removeMyRequest(orderId: string): void {
  const map = load();
  delete map[orderId];
  save(map);
}

/** Mark a request as approved (called when approval BC message arrives). */
export function markRequestApproved(orderId: string): void {
  const map = load();
  if (map[orderId]) {
    map[orderId] = { ...map[orderId], status: "approved" };
    save(map);
  }
}

/** Mark a request as declined (called when order fills up). */
export function markRequestDeclined(orderId: string): void {
  const map = load();
  if (map[orderId]) {
    map[orderId] = { ...map[orderId], status: "declined" };
    save(map);
  }
}
