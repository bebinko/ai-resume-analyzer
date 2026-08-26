import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { usePuterStore } from "~/lib/puter";

const Navbar = () => {
  const { auth } = usePuterStore();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on any click outside of it, since there's no overlay
  // to catch outside clicks the way a modal would.
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

  // Puter's auth has no "switch user" call directly — sign out then
  // immediately trigger sign-in again, which prompts Puter's account picker.
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
        <p className="text-2xl font-bold">Breezume</p>
      </Link>

      <div className="flex items-center gap-3">
        <Link to="/upload" className="primary-button w-fit">
          Upload Resume
        </Link>

        {auth.isAuthenticated && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((o) => !o)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400"
              title={auth.user?.username}
            >
              {auth.user?.username?.[0]?.toUpperCase() ?? "?"}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in duration-150">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 font-medium">
                    Signed in as
                  </p>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {auth.user?.username}
                  </p>
                </div>

                <Link
                  to="/settings"
                  onClick={() => setOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                >
                  {/* Settings gear icon (Heroicons) */}
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
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a7.712 7.712 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Settings
                </Link>

                <button
                  onClick={handleSwitchAccount}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                >
                  {/* Switch-account arrows icon (Heroicons) */}
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
                  {/* Sign-out icon (Heroicons) */}
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
