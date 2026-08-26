interface Tab {
  id: string;
  label: string;
  badge?: number | "dot";
}

const TabBar = ({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}) => {
  return (
    <div className="flex gap-2 flex-wrap border-b border-gray-100 pb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative text-sm font-semibold px-4 py-2 rounded-full transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === tab.id
              ? "primary-gradient text-white"
              : "bg-gray-50 text-gray-600 hover:bg-gray-100"
          }`}
        >
          {tab.label}
          {/* "dot" is a plain alert indicator with no count (e.g. low score
              warning); a number shows an actual count (e.g. items available) */}
          {tab.badge === "dot" && (
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
          )}
          {typeof tab.badge === "number" && tab.badge > 0 && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-white/25 text-white"
                  : "bg-indigo-100 text-indigo-700"
              }`}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default TabBar;
