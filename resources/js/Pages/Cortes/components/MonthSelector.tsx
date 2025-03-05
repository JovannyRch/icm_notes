import { Branch } from "@/types/Branch";
import { Inertia } from "@inertiajs/inertia";
import { router } from "@inertiajs/react";
import { Button, DropdownMenu } from "@radix-ui/themes";
import { useMemo } from "react";
import { BiCalendar } from "react-icons/bi";

const defaultDate = "THIS_MONTH";

const Options = [
    { label: "Este mes", value: "THIS_MONTH" },
    { label: "Mes anterior", value: "LAST_MONTH" },

    {
        label: "Este año",
        value: "THIS_YEAR",
    },
    {
        label: "Año anterior",
        value: "LAST_YEAR",
    },
    {
        label: "Todo el tiempo",
        value: "ALL_TIME",
    },
];

interface Props {
    branch: Branch;
}

const MonthSelector = ({ branch }: Props) => {
    const value = useMemo(() => {
        const filter = route().params.filter as string;

        if (filter) {
            return Options.find((option) => option.value === filter)?.label;
        }
        return "Este mes";
    }, []);

    const additionalParams = useMemo(() => {
        const params = { ...route().params };

        delete params.status;

        return params;
    }, []);

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <Button variant="soft">
                    <BiCalendar />
                    {value}

                    <DropdownMenu.TriggerIcon />
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
                {Options.map((option) => (
                    <DropdownMenu.Item
                        key={option.value}
                        onSelect={() => {
                            if (option.value === defaultDate) {
                                router.visit(
                                    route("cortes", {
                                        branch: branch.id,
                                    })
                                );
                            } else {
                                router.visit(
                                    route("cortes", {
                                        branch: branch.id,
                                        filter: option.value,
                                    })
                                );
                            }
                        }}
                        color={option.value === value ? "indigo" : undefined}
                    >
                        {option.label}
                    </DropdownMenu.Item>
                ))}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
};

export default MonthSelector;
