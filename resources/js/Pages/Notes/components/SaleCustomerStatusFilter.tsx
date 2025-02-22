import { Inertia } from "@inertiajs/inertia";
import { Button, DropdownMenu } from "@radix-ui/themes";
import { useMemo } from "react";
import { MdOutlineAttachMoney } from "react-icons/md";
const DATE_FILTERS_VALUES = {
    paid: "Pagado",
    pending: "Pendiente de pago",
    canceled: "Cancelado",
    NONE: "Estatus venta cliente",
};

type DateFilterKeys = keyof typeof DATE_FILTERS_VALUES;

const SaleCustomerStatusFilter = () => {
    const value = route().params.status as DateFilterKeys;

    const additionalParams = useMemo(() => {
        const params = { ...route().params };

        delete params.status;

        return params;
    }, []);

    const defaultDate = value
        ? DATE_FILTERS_VALUES[value]
        : DATE_FILTERS_VALUES.NONE;

    return (
        <div className="flex items-center gap-2">
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <Button variant="soft">
                        <MdOutlineAttachMoney />
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
                                    ...(key === "NONE" ? {} : { status: key }),
                                });
                            }}
                            color={value === defaultDate ? "indigo" : undefined}
                        >
                            {value === "Estatus venta cliente"
                                ? "Quitar filtro"
                                : value}
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    );
};

export default SaleCustomerStatusFilter;
