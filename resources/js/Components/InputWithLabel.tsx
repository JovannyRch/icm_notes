import React from "react";
import InputLabel from "./InputLabel";
import TextInput from "./TextInput";
import InputError from "./InputError";

interface Props {
    name: string;
    label: string;
    error?: string | undefined;
    type?: "text" | "email" | "password" | "number" | "date";
    value?: string | number;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    autoComplete?: boolean;
    readonly?: boolean;
    leading?: React.ReactNode | string;
    list?: string;
}

const InputWithLabel = ({
    name,
    label,
    error,
    type = "text",
    value,
    onChange,
    className,
    autoComplete = false,
    readonly = false,
    leading,
    list,
}: Props) => {
    return (
        <div className={className}>
            <InputLabel htmlFor={name} value={label} />

            <div className="flex gap-1">
                {leading && (
                    <div className="flex items-center gap-2">{leading}</div>
                )}
                <TextInput
                    id={name}
                    type={type}
                    name={name}
                    value={value}
                    className={`mt-1 block w-full  h-8 ${
                        readonly ? "bg-gray-100 pointer-events-none" : ""
                    }`}
                    autoComplete={autoComplete ? name : undefined}
                    onChange={onChange}
                    readOnly={readonly}
                    list={list}
                />
            </div>

            <InputError message={error} className="mt-2" />
        </div>
    );
};

export default InputWithLabel;
