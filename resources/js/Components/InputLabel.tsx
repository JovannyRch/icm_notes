import { LabelHTMLAttributes } from "react";

export default function InputLabel({
    value,
    className = "",
    children,
    ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { value?: string }) {
    return (
        <label
            {...props}
            className={`block text-[13px] font-medium text-graphite mb-1 ` + className}
        >
            {value ? value : children}
        </label>
    );
}
