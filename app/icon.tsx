import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#ffffff",
          fontSize: 240,
          fontWeight: 800,
          fontFamily: "sans-serif",
          flexDirection: "column",
          borderRadius: "112px",
        }}
      >
        <div style={{ display: "flex", marginTop: "-30px", letterSpacing: "-10px" }}>
          CM
        </div>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#f8d000",
            marginTop: "10px",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
