import SearchInput from "@/Components/SearchInput";
import { useUpdateEffect } from "@/hooks/useUpdateEffect";
import { Inertia } from "@inertiajs/inertia";
import { Button } from "@radix-ui/themes";
import { useState } from "react";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { FcClearFilters } from "react-icons/fc";
import { MdClear } from "react-icons/md";
import { useDebounce } from "use-debounce";

const ProductsSearchInput = () => {
    const queryParam = route().params.query;
    const [inputValue, setInputValue] = useState<string>(queryParam ?? "");

    const fetchProducts = async (query: string) => {
        if (query) {
            Inertia.get(route("products"), { query });
        } else {
            Inertia.get(route("products"));
        }
    };

    return (
        <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
                e.preventDefault();
                fetchProducts(inputValue);
            }}
        >
            <SearchInput
                onChange={(value) => setInputValue(value)}
                value={inputValue}
                placeholder="Buscar producto..."
                className="flex-1"
            />
            <Button type="submit" variant="soft">
                Buscar
                <FaMagnifyingGlass />
            </Button>

            {queryParam && (
                <>
                    <Button
                        variant="soft"
                        color="red"
                        type="button"
                        onClick={() => {
                            setInputValue("");
                            fetchProducts("");
                        }}
                    >
                        Limpiar
                        <MdClear />
                    </Button>
                </>
            )}
        </form>
    );
};

export default ProductsSearchInput;
