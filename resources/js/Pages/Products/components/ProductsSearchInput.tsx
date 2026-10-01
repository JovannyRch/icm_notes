import SearchInput from "@/Components/SearchInput";
import { useUpdateEffect } from "@/hooks/useUpdateEffect";
import { router } from "@inertiajs/react";
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
            router.get(route("products"), { query });
        } else {
            router.get(route("products"));
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
            <Button type="submit" variant="outline" color="gray">
                Buscar
            </Button>

            {queryParam && (
                <>
                    <Button
                        variant="ghost"
                        color="gray"
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
