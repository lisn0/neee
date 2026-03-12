type MobileTabsProps = {
  activeTab: "source" | "fields" | "draft";
  onChange: (tab: "source" | "fields" | "draft") => void;
};

export function MobileTabs({ activeTab, onChange }: MobileTabsProps) {
  return (
    <nav aria-label="Prototype panels" className="mobile-tabs">
      {(["source", "fields", "draft"] as const).map((tab) => (
        <button
          className={`mobile-tab${activeTab === tab ? " is-active" : ""}`}
          key={tab}
          onClick={() => onChange(tab)}
          type="button"
        >
          {tab[0].toUpperCase()}
          {tab.slice(1)}
        </button>
      ))}
    </nav>
  );
}
