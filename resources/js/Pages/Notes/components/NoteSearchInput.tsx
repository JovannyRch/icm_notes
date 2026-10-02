import SearchInput from "@/Components/SearchInput";
import { router } from "@inertiajs/react";
import { Button } from "@radix-ui/themes";
import React, { useMemo, useState } from "react";

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
            router.get(route("notas"), { ...additionalParams, query });
        } else {
            router.get(route("notas"), { ...additionalParams });
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
                placeholder="Folio, cliente, teléfono o código..."
                className="flex-1"
            />
            <Button type="submit" variant="outline" color="gray">
                Buscar
            </Button>
        </form>
    );
};

export default NoteSearchInput;
