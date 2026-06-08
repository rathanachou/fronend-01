import { Search, ScanLine, Sun, Moon, Store } from "lucide-react";
import type { Theme } from "@/hooks/useTheme";

interface PosHeaderProps {
  dark: boolean;
  toggleDark: () => void;
  searchText: string;
  onSearchChange: (value: string) => void;
  onScanClick: () => void;
  t: Theme;
}

export default function PosHeader({ dark, toggleDark, searchText, onSearchChange, onScanClick, t }: PosHeaderProps) {
  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: t.navBg, borderBottom: `1px solid ${t.navBorder}`, flexShrink: 0 }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(59,130,246,0.35)" }}>
          <Store style={{ width: 18, height: 18, color: "#fff" }} />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, lineHeight: 1 }}>LAVARSTORE</p>
          <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>Point of Sale</p>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", width: 320 }}>
        <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: t.textMuted }} />
        <input
          placeholder="Search products..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 10, background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, fontSize: 13, outline: "none" }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={onScanClick}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 500, background: dark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.08)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)", cursor: "pointer" }}
        >
          <ScanLine style={{ width: 14, height: 14 }} /> Scan Barcode
        </button>
        <button
          onClick={toggleDark}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, fontSize: 12, fontWeight: 500, background: t.btnBg, border: `1px solid ${t.btnBorder}`, color: t.btnText, cursor: "pointer" }}
        >
          {dark
            ? <Sun  style={{ width: 14, height: 14, color: "#fbbf24" }} />
            : <Moon style={{ width: 14, height: 14, color: "#3b82f6" }} />}
          {dark ? "Light" : "Dark"}
        </button>
      </div>
    </header>
  );
}