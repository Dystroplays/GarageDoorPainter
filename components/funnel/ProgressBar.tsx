const STEP_LABELS = [
  "Your Info",
  "Overview",
  "Preview Colors",
  "Configure & Price",
  "Schedule",
  "Checkout",
];

interface Props {
  step: number;
  total?: number;
}

export default function ProgressBar({ step, total = 6 }: Props) {
  return (
    <div className="bg-bolt-black border-b border-white/10 py-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">
            Step <span className="text-white font-medium">{step}</span> of {total}
            {STEP_LABELS[step - 1] && (
              <span className="text-gray-500"> — {STEP_LABELS[step - 1]}</span>
            )}
          </span>
          <span className="text-gray-500 text-xs">{Math.round((step / total) * 100)}% complete</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i + 1 <= step ? "bg-bolt-yellow" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
