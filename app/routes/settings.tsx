import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Navbar from "~/components/Navbar";
import { usePuterStore } from "~/lib/puter";

export const meta = () => [
  { title: "Breezume | Settings" },
  { name: "description", content: "Manage your account and data" },
];

const Settings = () => {
  const { auth, isLoading, fs, kv } = usePuterStore();
  const navigate = useNavigate();

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isWiping, setIsWiping] = useState(false);
  const [wipeComplete, setWipeComplete] = useState(false);
  const [wipeError, setWipeError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate("/auth?next=/settings");
    }
  }, [isLoading]);

  const handleWipeData = async () => {
    setIsWiping(true);
    setWipeError(null);
    try {
      const files = (await fs.readDir("./")) ?? [];
      for (const file of files) {
        await fs.delete(file.path);
      }
      await kv.flush();
      setWipeComplete(true);
      setShowConfirm(false);
      setConfirmText("");
    } catch (err: any) {
      setWipeError(
        err?.message || "Something went wrong while wiping your data.",
      );
    } finally {
      setIsWiping(false);
    }
  };

  const isConfirmValid = confirmText.trim().toUpperCase() === "DELETE";

  return (
    <main className="bg-white min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-12 !gap-4">
          <h1>Settings</h1>
          <h2>Manage your account and resume data</h2>
        </div>

        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
          {/* Account info */}
          <div className="rounded-2xl bg-white shadow-md p-6 flex flex-col gap-2">
            <h3 className="text-lg font-bold text-gray-900">Account</h3>
            <p className="text-sm text-gray-500">
              Signed in as{" "}
              <span className="font-semibold text-gray-700">
                {auth.user?.username}
              </span>
            </p>
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl bg-white border border-red-200 shadow-md p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-bold text-red-700">Danger Zone</h3>
              <p className="text-sm text-gray-500 mt-1">
                These actions are permanent and cannot be undone.
              </p>
            </div>

            {wipeComplete ? (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                <p className="text-sm text-green-700 font-medium">
                  All your resume data has been wiped.
                </p>
              </div>
            ) : (
              <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-800">
                    Wipe all resume data
                  </p>
                  <p className="text-sm text-gray-500">
                    Permanently deletes every resume, image, and feedback you've
                    uploaded.
                  </p>
                </div>
                <button
                  onClick={() => setShowConfirm(true)}
                  className="text-sm font-medium px-4 py-2 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  Wipe Data
                </button>
              </div>
            )}

            {wipeError && <p className="text-sm text-red-600">{wipeError}</p>}
          </div>
        </div>
      </section>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md flex flex-col gap-4 animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">Are you sure?</p>
                <p className="text-sm text-gray-500 mt-1">
                  This will permanently delete all your resumes, images, and
                  feedback. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600">
                Type <span className="font-semibold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="!w-full !p-3 !rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-300"
                placeholder="DELETE"
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmText("");
                }}
                className="text-sm font-medium px-4 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                disabled={isWiping}
              >
                Cancel
              </button>
              <button
                onClick={handleWipeData}
                disabled={!isConfirmValid || isWiping}
                className="text-sm font-medium px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isWiping ? "Wiping..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Settings;
