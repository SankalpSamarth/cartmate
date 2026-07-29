export interface Order {
  id: string;
  platform: string;
  hostel: string;
  floor: string | null;
  note: string;
  whatsapp_number: string;
  device_id: string;
  created_at: string;
  expires_at: string;
}

export interface MyPostRecord {
  id: string;
  device_id: string;
  expires_at: string;
}

export interface JoinRequest {
  id: string;
  order_id: string;
  requester_device_id: string;
  requester_name: string | null;
  note: string;
  status: "pending" | "approved";
  created_at: string;
}
