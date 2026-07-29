"use client";

import { HOSTELS } from "@/lib/constants";

interface FilterTabsProps {
  selected: string;
  onChange: (hostel: string) => void;
}

export function FilterTabs({ selected, onChange }: FilterTabsProps) {
  const tabs = ["All", ...HOSTELS];

  return (
    <div className="filter-tabs-wrapper">
      <div className="filter-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`filter-tab ${selected === tab ? "filter-tab--active" : ""}`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
