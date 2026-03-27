"use client";

interface AvailabilitySelectProps {
  value: string;
  onChange: (value: string) => void;
}

const options = [
  {
    value: "available",
    label: "Available",
    description: "Actively looking to help",
    color: "bg-green-100 text-green-700 ring-green-300",
  },
  {
    value: "limited",
    label: "Limited",
    description: "Can help occasionally",
    color: "bg-yellow-100 text-yellow-700 ring-yellow-300",
  },
  {
    value: "unavailable",
    label: "Unavailable",
    description: "Not taking requests right now",
    color: "bg-gray-100 text-gray-600 ring-gray-300",
  },
];

export function AvailabilitySelect({
  value,
  onChange,
}: AvailabilitySelectProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        Availability
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-lg border p-3 text-left transition-all ${
              value === opt.value
                ? `${opt.color} ring-2`
                : "border-border hover:border-gray-300"
            }`}
          >
            <p className="text-sm font-medium">{opt.label}</p>
            <p className="text-xs text-text-secondary">{opt.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
