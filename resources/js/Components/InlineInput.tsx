import React from "react";
import InputLabel from "./InputLabel";
import TextInput from "./TextInput";
import InputError from "./InputError";
import { Text } from "@radix-ui/themes";

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
}

const InlineInput = ({
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
}: Props) => {
    return (
        <div className="flex flex-col gap-1">
            <div
                className={`flex justify-center items-center gap-3 ${className}`}
            >
                <Text size="3" className="flex-1" weight="medium">
                    {label}
                </Text>

                <div className="flex items-center gap-1">
                    {leading && (
                        <div className="flex items-center gap-2">{leading}</div>
                    )}
                    <TextInput
                        id={name}
                        type={type}
                        name={name}
                        value={value}
                        className={`mt-1 block w-full flex-1 text-right h-8 ${
                            readonly ? "bg-gray-100 pointer-events-none" : ""
                        }`}
                        autoComplete={autoComplete ? name : undefined}
                        onChange={onChange}
                        readOnly={readonly}
                    />
                </div>
            </div>
            <InputError message={error} className="mt-2" />
        </div>
    );
};

export default InlineInput;
