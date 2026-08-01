// ─────────────────────────────────────────────────────────────
// CartMate — editable campus config
// Edit HOSTELS to match your actual hostel/building names.
// ─────────────────────────────────────────────────────────────

export const HOSTELS = [
  "HB4 C-WING (Boys)",
  "HB4 D-WING (Boys)",
  "HB4 C-WING (Girls)",
  "HB4 D-WING (Girls)",
];

export const PLATFORMS = [
  "Blinkit",
  "Swiggy Instamart",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_COLORS: Record<Platform, { bg: string; text: string; border: string }> = {
  Blinkit: {
    bg: "rgba(248, 208, 0, 0.15)",
    text: "#f8d000",
    border: "rgba(248, 208, 0, 0.4)",
  },
  "Swiggy Instamart": {
    bg: "rgba(252, 128, 25, 0.15)",
    text: "#fc8019",
    border: "rgba(252, 128, 25, 0.4)",
  },
};

export const DURATIONS = [10, 15, 20] as const;
export type Duration = (typeof DURATIONS)[number];

export const WHATSAPP_MESSAGE_TEMPLATE = (platform: string, hostel: string, posterName: string) =>
  `Hey ${posterName}! Saw your CartMate post — ordering from ${platform} at ${hostel}. Can I join in with something?`;
