import { AppIcon } from "./src/AppIcon";

export default function Popup() {
  return (
    <main
      style={{
        width: "280px",
        padding: "16px",
        fontFamily:
          '"IBM Plex Sans", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
        <AppIcon decorative size={34} style={{ borderRadius: "8px" }} />
        <h1
          style={{
            margin: 0,
            fontSize: "18px",
            color: "#0f172a"
          }}>
          Loop Extension
        </h1>
      </div>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: "14px",
          lineHeight: 1.5,
          color: "#334155"
        }}>
        Open a supported LeetCode problem page to use the floating interviewer
        shell.
      </p>
    </main>
  );
}
