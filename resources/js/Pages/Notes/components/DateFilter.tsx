import { Inertia } from "@inertiajs/inertia";
import { Button, DropdownMenu } from "@radix-ui/themes";
import { useMemo } from "react";
import { FaRegCalendarAlt } from "react-icons/fa";

const DATE_FILTERS_VALUES = {
    TODAY: "Hoy",
    YESTERDAY: "Ayer",
    THIS_WEEK: "Esta semana",
    LAST_WEEK: "Semana pasada",
    THIS_MONTH: "Este mes",
    LAST_MONTH: "Mes pasado",
    THIS_YEAR: "Este año",
    LAST_YEAR: "Año pasado",
    ALL_TIME: "Todo el tiempo",
};

type DateFilterKeys = keyof typeof DATE_FILTERS_VALUES;

const DateFilter = () => {
    const date = route().params.date as DateFilterKeys;

    const additionalParams = useMemo(() => {
        const params = { ...route().params };

        delete params.date;

        return params;
    }, []);

    const defaultDate = date
        ? DATE_FILTERS_VALUES[date]
        : DATE_FILTERS_VALUES.THIS_WEEK;

    return (
        <div className="flex items-center gap-2">
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <Button variant="soft">
                        <FaRegCalendarAlt />
                        {defaultDate}

                        <DropdownMenu.TriggerIcon />
                    </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    {Object.entries(DATE_FILTERS_VALUES).map(([key, value]) => (
                        <DropdownMenu.Item
                            key={key}
                            onSelect={() => {
                                Inertia.get(route("notas"), {
                                    ...additionalParams,
                                    date: key as DateFilterKeys,
                                });
                            }}
                            color={value === defaultDate ? "indigo" : undefined}
                        >
                            {value}
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    );
};

export default DateFilter;
