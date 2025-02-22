import SearchInput from "@/Components/SearchInput";
import { Inertia } from "@inertiajs/inertia";
import { Button } from "@radix-ui/themes";
import React, { useMemo, useState } from "react";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { MdClear } from "react-icons/md";

const NoteSearchInput = () => {
    const queryParam = route().params.query;

    const additionalParams = useMemo(() => {
        const params = { ...route().params };

        delete params.query;

        return params;
    }, []);

    const [inputValue, setInputValue] = useState<string>(queryParam ?? "");

    const fetchNotes = async (query: string) => {
        if (query) {
            Inertia.get(route("notas"), { ...additionalParams, query });
        } else {
            Inertia.get(route("notas"), { ...additionalParams });
        }
    };

    return (
        <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
                e.preventDefault();
                fetchNotes(inputValue);
            }}
        >
            <SearchInput
                onChange={(value) => setInputValue(value)}
                value={inputValue}
                placeholder="Buscar nota..."
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
                            fetchNotes("");
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

export default NoteSearchInput;
