import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { usePuterStore } from "~/lib/puter";

const Navbar = () => {
  const { auth } = usePuterStore();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSwitchAccount = async () => {
    setOpen(false);
    await auth.signOut();
    await auth.signIn();
  };

  const handleSignOut = async () => {
    setOpen(false);
    await auth.signOut();
  };

  return (
    <nav className="navbar">
      <Link to="/">
        <p className="text-2xl font-bold ">Breezume</p>
      </Link>

      <div className="flex items-center gap-3">
        <Link to="/upload" className="primary-button w-fit">
          Upload Resume
        </Link>

        {auth.isAuthenticated && (
          <div className="relative" ref={dropdownRef}>
            {/* Avatar button */}
            <button
              onClick={() => setOpen((o) => !o)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400"
              title={auth.user?.username}
            >
              {auth.user?.username?.[0]?.toUpperCase() ?? "?"}
            </button>

            {/* Dropdown */}
            {open && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in duration-150">
                {/* Username label */}
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 font-medium">
                    Signed in as
                  </p>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {auth.user?.username}
                  </p>
                </div>

                <button
                  onClick={handleSwitchAccount}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 3M21 7.5H7.5"
                    />
                  </svg>
                  Switch Account
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                    />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
