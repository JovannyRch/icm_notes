import React from "react";

interface InlineInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

const InlineInput2: React.FC<InlineInputProps> = ({
    label,
    value,
    onChange,
}) => {
    return (
        <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
                {label}:
            </label>
            <input
                type="text"
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
};

export default InlineInput2;
