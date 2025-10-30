import { textWithEllipsis } from "@/helpers/utils";
import { Inertia } from "@inertiajs/inertia";
import { Button, DropdownMenu } from "@radix-ui/themes";
import { ReactNode, useMemo } from "react";

interface DropdownFilterProps<T extends string> {
    icon?: ReactNode;
    values: Record<T, string>;
    paramKey: string;
    defaultLabel?: string;
    routeName: string;
    className?: string;
    defaultValue?: string;
    onSelect?: (value: T | undefined) => void;
}

export const DropdownFilter = <T extends string>({
    icon,
    values,
    paramKey,
    defaultLabel = "Filtro",
    routeName,
    className = "",
    defaultValue,
    onSelect,
}: DropdownFilterProps<T>) => {
    const currentValue = route().params[paramKey] as T | undefined;

    const additionalParams = useMemo(() => {
        const params = { ...route().params };
        delete params[paramKey];
        return params;
    }, [paramKey]);

    const value = currentValue
        ? values[currentValue]
        : values[defaultValue as T];

    const hasValue = Boolean(value);

    return (
        <div className={`flex items-center gap-2 justify-center ${className}`}>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <Button
                        variant="ghost"
                        size="3"
                        color="gray"
                        className="text-black"
                    >
                        {icon}
                        <div className="text-sm font-bold text-black">
                            {defaultLabel}
                            {value && (
                                <>
                                    <span className="font-normal">
                                        <br />
                                        {textWithEllipsis(value as string, 30)}
                                    </span>
                                </>
                            )}
                        </div>
                        <DropdownMenu.TriggerIcon />
                    </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    {Object.entries(values).map(([key, label]) => {
                        const k = key as T;
                        return (
                            <DropdownMenu.Item
                                key={k}
                                onSelect={() => {
                                    onSelect?.(k === "NONE" ? undefined : k);
                                    const url = route(routeName);
                                    const params = {
                                        ...additionalParams,
                                        ...(k === "NONE"
                                            ? {}
                                            : { [paramKey]: k }),
                                    };

                                    Inertia.get(url, params);
                                }}
                                color={
                                    values[k] === value ? "indigo" : undefined
                                }
                            >
                                {label as ReactNode}
                            </DropdownMenu.Item>
                        );
                    })}
                    {hasValue && (
                        <DropdownMenu.Item
                            onSelect={() => {
                                const url = route(routeName);
                                const params = { ...additionalParams };
                                Inertia.get(url, params);
                            }}
                            color="red"
                        >
                            <div>Quitar filtro</div>
                        </DropdownMenu.Item>
                    )}
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    );
};
