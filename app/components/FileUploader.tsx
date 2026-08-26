import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { formatSize } from "~/lib/utils";

interface FileUploaderProps {
  onFileSelect?: (file: File | null) => void;
}

const FileUploader = ({ onFileSelect }: FileUploaderProps) => {
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        const reason = fileRejections[0].errors[0]?.code;
        if (reason === "file-too-large") {
          setRejectionError(
            `File is too large — max ${formatSize(maxFileSize)}.`,
          );
        } else if (reason === "file-invalid-type") {
          setRejectionError("Only PDF files are supported.");
        } else {
          setRejectionError(
            "This file couldn't be uploaded. Please try another.",
          );
        }
        onFileSelect?.(null);
        return;
      }

      setRejectionError(null);
      const file = acceptedFiles[0] || null;
      onFileSelect?.(file);
    },
    [onFileSelect],
  );

  const maxFileSize = 5 * 1024 * 1024; // 5MB — keep in sync with maxSize below
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({
      onDrop,
      multiple: false,
      accept: { "application/pdf": [".pdf"] },
      maxSize: 5 * 1024 * 1024,
    });

  const file = acceptedFiles[0] || null;

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="w-full gradient-border">
        <div
          {...getRootProps()}
          className={`uploader-drag-area ${isDragActive ? "drag-active" : ""}`}
        >
          <input {...getInputProps()} />
          <div className="space-y-4 cursor-pointer">
            {file ? (
              <div
                className="uploader-selected-file"
                // Stop the click from bubbling up to the dropzone, otherwise
                // clicking the remove button would also reopen the file picker
                onClick={(e) => e.stopPropagation()}
              >
                <img src="/images/pdf.png" alt="pdf" className="size-10" />
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  className="p-2 cursor-pointer"
                  onClick={(e) => {
                    onFileSelect?.(null);
                  }}
                >
                  <img
                    src="/icons/cross.svg"
                    alt="remove"
                    className="w-4 h-4"
                  />
                </button>
              </div>
            ) : (
              <div>
                <div className="mx-auto w-16 h-16 flex items-center justify-center mb-2">
                  <img src="/icons/info.svg" alt="upload" className="size-20" />
                </div>
                <p className="text-lg text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-lg text-gray-500">
                  PDF (max {formatSize(maxFileSize)})
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {rejectionError && (
        <p className="text-sm text-red-600">{rejectionError}</p>
      )}
    </div>
  );
};
export default FileUploader;
