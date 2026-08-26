interface Step {
  id: string;
  label: string;
}

const ProgressSteps = ({
  steps,
  currentStep,
}: {
  steps: Step[];
  currentStep: number;
}) => {
  return (
    <div className="flex flex-col items-center gap-8 py-10">
      <img src="/images/resume-scan.gif" className="w-[220px]" alt="scanning" />
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-3">
            {/* Each step is in one of three states relative to currentStep:
                already done (checkmark, green), in progress (pulsing, blue),
                or not started yet (numbered, gray). */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300 ${
                i < currentStep
                  ? "bg-green-500 text-white"
                  : i === currentStep
                    ? "bg-blue-500 text-white animate-pulse"
                    : "bg-gray-200 text-gray-400"
              }`}
            >
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span
              className={`text-sm font-medium transition-colors duration-300 ${
                i < currentStep
                  ? "text-green-600"
                  : i === currentStep
                    ? "text-blue-600"
                    : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressSteps;
