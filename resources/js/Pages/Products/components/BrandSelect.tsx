import { Inertia } from "@inertiajs/inertia";
import { Button, DropdownMenu } from "@radix-ui/themes";
import { useMemo } from "react";
import { FaTicketSimple } from "react-icons/fa6";

interface Props {
    brands: {
        brand: string;
    }[];
}

const defaultDate = "Todas las marcas";

const BrandSelect = ({ brands }: Props) => {
    const value = (route().params.brand as string) || defaultDate;

    const additionalParams = useMemo(() => {
        const params = { ...route().params };

        delete params.status;

        return params;
    }, []);

    const brandsValues = [...brands.map(({ brand }) => brand), defaultDate];

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <Button variant="soft">
                    <FaTicketSimple />
                    {value}

                    <DropdownMenu.TriggerIcon />
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
                {brandsValues.map((brand) => (
                    <DropdownMenu.Item
                        key={brand}
                        onSelect={() => {
                            if (brand === defaultDate) {
                                Inertia.get(route("products"), {
                                    ...additionalParams,
                                    brand: "",
                                });
                            } else {
                                Inertia.get(route("products"), {
                                    ...additionalParams,
                                    brand,
                                });
                            }
                        }}
                        color={brand === value ? "indigo" : undefined}
                    >
                        {brand}
                    </DropdownMenu.Item>
                ))}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
};

export default BrandSelect;
