import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Navbar from "~/components/Navbar";
import { usePuterStore } from "~/lib/puter";

export const meta = () => [
  { title: "Breezume | Settings" },
  { name: "description", content: "Manage your account and resume data" },
];

const Settings = () => {
  const { auth, isLoading, fs, kv } = usePuterStore();
  const navigate = useNavigate();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccessCount, setDeleteSuccessCount] = useState<number | null>(
    null,
  );
  const [coverLetters, setCoverLetters] = useState<CoverLetterRecord[]>([]);
  const [loadingCoverLetters, setLoadingCoverLetters] = useState(false);
  const [selectedCoverLetterIds, setSelectedCoverLetterIds] = useState<
    Set<string>
  >(new Set());
  const [showCoverLetterConfirm, setShowCoverLetterConfirm] = useState(false);
  const [coverLetterConfirmText, setCoverLetterConfirmText] = useState("");
  const [isDeletingCoverLetters, setIsDeletingCoverLetters] = useState(false);
  const [coverLetterDeleteError, setCoverLetterDeleteError] = useState<
    string | null
  >(null);
  const [coverLetterDeleteSuccessCount, setCoverLetterDeleteSuccessCount] =
    useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate("/auth?next=/settings");
    }
  }, [isLoading]);

  const loadResumes = async () => {
    setLoadingResumes(true);
    const raw = (await kv.list("resume:*", true)) as KVItem[];
    const parsed = raw?.map((r) => JSON.parse(r.value) as Resume) || [];
    setResumes(parsed);
    setLoadingResumes(false);
  };

  const loadCoverLetters = async () => {
    setLoadingCoverLetters(true);
    const raw = (await kv.list("cover-letter:*", true)) as KVItem[];
    const parsed =
      raw
        ?.map((item) => JSON.parse(item.value) as CoverLetterRecord)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) || [];
    setCoverLetters(parsed);
    setLoadingCoverLetters(false);
  };

  useEffect(() => {
    loadResumes();
    loadCoverLetters();
  }, []);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = resumes.length > 0 && selectedIds.size === resumes.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(resumes.map((r) => r.id)));
    }
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const toDelete = resumes.filter((r) => selectedIds.has(r.id));

      for (const resume of toDelete) {
        try {
          await fs.delete(resume.resumePath);
        } catch {
          // file may already be gone — don't block the rest of the cleanup
        }
        try {
          await fs.delete(resume.imagePath);
        } catch {
          // same as above
        }
        if (resume.docxPath) {
          try {
            await fs.delete(resume.docxPath);
          } catch {
            // optional Word export may already be gone
          }
        }
        await kv.delete(`resume:${resume.id}`);
      }

      setDeleteSuccessCount(toDelete.length);
      setSelectedIds(new Set());
      setShowConfirm(false);
      setConfirmText("");
      await loadResumes();
    } catch (err: any) {
      setDeleteError(
        err?.message || "Something went wrong while deleting your resumes.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Requires typing "DELETE" (case-insensitive) before the confirm button
  // is enabled — a plain "yes/no" prompt is too easy to click through.
  const isConfirmValid = confirmText.trim().toUpperCase() === "DELETE";

  const toggleCoverLetterSelected = (id: string) => {
    setSelectedCoverLetterIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allCoverLettersSelected =
    coverLetters.length > 0 &&
    selectedCoverLetterIds.size === coverLetters.length;

  const toggleSelectAllCoverLetters = () => {
    setSelectedCoverLetterIds(
      allCoverLettersSelected
        ? new Set()
        : new Set(coverLetters.map((letter) => letter.id)),
    );
  };

  const handleDeleteSelectedCoverLetters = async () => {
    setIsDeletingCoverLetters(true);
    setCoverLetterDeleteError(null);
    try {
      const toDelete = coverLetters.filter((letter) =>
        selectedCoverLetterIds.has(letter.id),
      );

      for (const letter of toDelete) {
        try {
          await fs.delete(letter.pdfPath);
        } catch {
          // Continue removing the record if a file was already deleted.
        }
        try {
          await fs.delete(letter.docxPath);
        } catch {
          // Same as above.
        }
        await kv.delete(`cover-letter:${letter.id}`);
      }

      setCoverLetterDeleteSuccessCount(toDelete.length);
      setSelectedCoverLetterIds(new Set());
      setShowCoverLetterConfirm(false);
      setCoverLetterConfirmText("");
      await loadCoverLetters();
    } catch (err) {
      setCoverLetterDeleteError(
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting your cover letters.",
      );
    } finally {
      setIsDeletingCoverLetters(false);
    }
  };

  const isCoverLetterConfirmValid =
    coverLetterConfirmText.trim().toUpperCase() === "DELETE";

  return (
    <main className="bg-white min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-12 !gap-4">
          <h1>Settings</h1>
          <h2>Manage your account and resume data</h2>
        </div>

        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
          <div className="rounded-2xl bg-white shadow-md p-6 flex flex-col gap-2">
            <h3 className="text-lg font-bold text-gray-900">Account</h3>
            <p className="text-sm text-gray-500">
              Signed in as{" "}
              <span className="font-semibold text-gray-700">
                {auth.user?.username}
              </span>
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-red-200 shadow-md p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-bold text-red-700">Delete Resumes</h3>
              <p className="text-sm text-gray-500 mt-1">
                Select the resumes you want to permanently remove.
              </p>
            </div>

            {deleteSuccessCount !== null && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                <p className="text-sm text-green-700 font-medium">
                  Deleted {deleteSuccessCount} resume
                  {deleteSuccessCount !== 1 ? "s" : ""}.
                </p>
              </div>
            )}

            {deleteError && (
              <p className="text-sm text-red-600">{deleteError}</p>
            )}

            {loadingResumes ? (
              <p className="text-sm text-gray-400">Loading your resumes...</p>
            ) : resumes.length === 0 ? (
              <p className="text-sm text-gray-400">
                You don't have any resumes stored yet.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                  <span className="text-xs text-gray-400">
                    {selectedIds.size} of {resumes.length} selected
                  </span>
                </div>

                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                  {resumes.map((resume) => (
                    <label
                      key={resume.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(resume.id)}
                        onChange={() => toggleSelected(resume.id)}
                        className="!w-4 !p-0 accent-red-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {resume.companyName || "Resume"}
                          {resume.isRevision && (
                            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                              AI Revised
                            </span>
                          )}
                        </p>
                        {resume.jobTitle && (
                          <p className="text-xs text-gray-500 truncate">
                            {resume.jobTitle}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {resume.feedback?.overallScore ?? "—"}/100
                      </span>
                    </label>
                  ))}
                </div>

                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={selectedIds.size === 0}
                  className="w-fit text-sm font-medium px-4 py-2 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Delete Selected ({selectedIds.size})
                </button>
              </>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-red-200 shadow-md p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-bold text-red-700">
                Delete Cover Letters
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Select the saved cover letters you want to permanently remove.
              </p>
            </div>

            {coverLetterDeleteSuccessCount !== null && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                <p className="text-sm text-green-700 font-medium">
                  Deleted {coverLetterDeleteSuccessCount} cover letter
                  {coverLetterDeleteSuccessCount !== 1 ? "s" : ""}.
                </p>
              </div>
            )}

            {coverLetterDeleteError && (
              <p className="text-sm text-red-600">{coverLetterDeleteError}</p>
            )}

            {loadingCoverLetters ? (
              <p className="text-sm text-gray-400">
                Loading your cover letters...
              </p>
            ) : coverLetters.length === 0 ? (
              <p className="text-sm text-gray-400">
                You don't have any cover letters stored yet.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <button
                    onClick={toggleSelectAllCoverLetters}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    {allCoverLettersSelected ? "Deselect All" : "Select All"}
                  </button>
                  <span className="text-xs text-gray-400">
                    {selectedCoverLetterIds.size} of {coverLetters.length}{" "}
                    selected
                  </span>
                </div>

                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                  {coverLetters.map((letter) => (
                    <label
                      key={letter.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCoverLetterIds.has(letter.id)}
                        onChange={() => toggleCoverLetterSelected(letter.id)}
                        className="!w-4 !p-0 accent-red-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {letter.companyName || "Cover Letter"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {letter.jobTitle || "Tailored application"}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(letter.createdAt).toLocaleDateString()}
                      </span>
                    </label>
                  ))}
                </div>

                <button
                  onClick={() => setShowCoverLetterConfirm(true)}
                  disabled={selectedCoverLetterIds.size === 0}
                  className="w-fit text-sm font-medium px-4 py-2 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Delete Selected ({selectedCoverLetterIds.size})
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md flex flex-col gap-4 animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                {/* Warning triangle icon (Heroicons) */}
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
                <p className="font-bold text-gray-900 text-lg">
                  Delete {selectedIds.size} resume
                  {selectedIds.size !== 1 ? "s" : ""}?
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  This will permanently delete the selected resumes, their
                  images, and feedback. This cannot be undone.
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
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={!isConfirmValid || isDeleting}
                className="text-sm font-medium px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCoverLetterConfirm && (
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
                <p className="font-bold text-gray-900 text-lg">
                  Delete {selectedCoverLetterIds.size} cover letter
                  {selectedCoverLetterIds.size !== 1 ? "s" : ""}?
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  This permanently deletes the selected cover letters and their
                  PDF and Word files. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600">
                Type <span className="font-semibold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={coverLetterConfirmText}
                onChange={(event) =>
                  setCoverLetterConfirmText(event.target.value)
                }
                className="!w-full !p-3 !rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-300"
                placeholder="DELETE"
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCoverLetterConfirm(false);
                  setCoverLetterConfirmText("");
                }}
                className="text-sm font-medium px-4 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                disabled={isDeletingCoverLetters}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelectedCoverLetters}
                disabled={!isCoverLetterConfirmValid || isDeletingCoverLetters}
                className="text-sm font-medium px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeletingCoverLetters ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Settings;
