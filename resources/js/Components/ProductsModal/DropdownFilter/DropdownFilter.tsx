import { textWithEllipsis } from "@/helpers/utils";
import { router } from "@inertiajs/react";
import { DropdownMenu } from "@radix-ui/themes";
import { ReactNode, useMemo } from "react";
import { LuCheck, LuChevronDown } from "react-icons/lu";

interface DropdownFilterProps<T extends string> {
    icon?: ReactNode;
    values: Record<T, string>;
    paramKey: string;
    defaultLabel?: string;
    routeName: string;
    className?: string;
    defaultValue?: string;
    onSelect?: (value: T | undefined) => void;
    resetPage?: boolean;
}

/**
 * Filtro en píldora: "Etiqueta: valor". Al elegir, navega a `routeName` con el
 * parámetro `paramKey` y conserva los demás parámetros de la URL.
 */
export const DropdownFilter = <T extends string>({
    icon,
    values,
    paramKey,
    defaultLabel = "Filtro",
    routeName,
    className = "",
    defaultValue,
    onSelect,
    resetPage = false,
}: DropdownFilterProps<T>) => {
    const currentValue = route().params[paramKey] as T | undefined;

    const additionalParams = useMemo(() => {
        const params = { ...route().params };
        delete params[paramKey];
        if (resetPage) {
            delete params.page;
        }
        return params;
    }, [paramKey, resetPage]);

    const selectedKey = (currentValue ?? defaultValue) as T | undefined;
    const value = selectedKey ? values[selectedKey] : undefined;
    const hasValue = Boolean(value);

    return (
        <div className={className}>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <button
                        type="button"
                        className={`inline-flex items-center gap-1.5 h-8 px-3 text-[13px] rounded-tag border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-electric/30 ${
                            hasValue
                                ? "bg-sky-tint border-sky-tint text-charcoal"
                                : "bg-white border-ash text-steel hover:bg-paper hover:text-charcoal"
                        }`}
                    >
                        {icon && <span className="text-fog [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>}
                        <span className="font-medium">{defaultLabel}</span>
                        {value && (
                            <span className="text-electric">: {textWithEllipsis(value as string, 30)}</span>
                        )}
                        <LuChevronDown className="w-3.5 h-3.5 text-fog" aria-hidden />
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content variant="soft" color="gray">
                    {Object.entries(values).map(([key, label]) => {
                        const k = key as T;
                        return (
                            <DropdownMenu.Item
                                key={k}
                                onSelect={() => {
                                    onSelect?.(k === "NONE" ? undefined : k);
                                    router.get(route(routeName), {
                                        ...additionalParams,
                                        ...(k === "NONE" ? {} : { [paramKey]: k }),
                                    });
                                }}
                            >
                                <span className="flex items-center justify-between w-full gap-6">
                                    {label as ReactNode}
                                    {values[k] === value && <LuCheck className="w-4 h-4 text-electric" />}
                                </span>
                            </DropdownMenu.Item>
                        );
                    })}
                    {hasValue && (
                        <>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item
                                color="red"
                                onSelect={() => router.get(route(routeName), { ...additionalParams })}
                            >
                                Quitar filtro
                            </DropdownMenu.Item>
                        </>
                    )}
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    );
};
