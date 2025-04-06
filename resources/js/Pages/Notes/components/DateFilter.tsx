import { DATE_FILTERS_VALUES } from "@/const";
import { Inertia } from "@inertiajs/inertia";
import { Button, DropdownMenu } from "@radix-ui/themes";
import { useMemo } from "react";
import { FaRegCalendarAlt } from "react-icons/fa";
import { useLocalStorage } from "usehooks-ts";

type DateFilterKeys = keyof typeof DATE_FILTERS_VALUES;

const DateFilter = ({ branchId }: { branchId: number }) => {
    const date = route().params.date as DateFilterKeys;

    const additionalParams = useMemo(() => {
        const params = { ...route().params };

        delete params.date;

        return params;
    }, []);

    const [filterDate, setFilterDate] = useLocalStorage(
        `date-filter-${branchId}`,
        "THIS_WEEK"
    );

    return (
        <div className="flex items-center gap-2">
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <Button variant="soft">
                        <FaRegCalendarAlt />
                        {DATE_FILTERS_VALUES[filterDate as DateFilterKeys]}
                        <DropdownMenu.TriggerIcon />
                    </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    {Object.entries(DATE_FILTERS_VALUES).map(([key, value]) => (
                        <DropdownMenu.Item
                            key={key}
                            onSelect={() => {
                                console.log("key", key);
                                setFilterDate(key as DateFilterKeys);
                                Inertia.get(route("notas"), {
                                    ...additionalParams,
                                    date: key as DateFilterKeys,
                                });
                            }}
                            color={value === filterDate ? "indigo" : undefined}
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
