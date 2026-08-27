"use client";

import { HOSTELS } from "@/lib/constants";

interface FilterTabsProps {
  selected: string;
  onChange: (hostel: string) => void;
}

export function FilterTabs({ selected, onChange }: FilterTabsProps) {
  const tabs = ["All", ...HOSTELS];

  const labelFor = (tab: string) => {
    if (tab === "All") return "All hostels";
    return tab
      .replace(/^HB4\s+/i, "")
      .replace(/-WING/i, "-Wing")
      .replace(/\s*\(([^)]+)\)$/, " · $1");
  };

  return (
    <div className="filter-tabs-wrapper">
      <div className="filter-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`filter-tab ${selected === tab ? "filter-tab--active" : ""}`}
            aria-pressed={selected === tab}
          >
            {labelFor(tab)}
          </button>
        ))}
      </div>
    </div>
  );
}
