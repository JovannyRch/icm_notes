import { useBranch } from "@/hooks/useBranch";
import { DropdownMenu } from "@radix-ui/themes";
import axios from "axios";
import { useState } from "react";
import { LuCheck, LuChevronsUpDown, LuStore } from "react-icons/lu";

/**
 * Cambia la sucursal activa (sesión). Tras el POST se recarga la página completa:
 * BranchContext se carga una sola vez al arrancar (ver app.tsx).
 */
export const BranchSelector = ({ fullWidth = false }: { fullWidth?: boolean }) => {
    const { branches, currentBranch } = useBranch();
    const [switching, setSwitching] = useState(false);

    const handleSelect = (branchId: number) => {
        if (branchId === currentBranch?.id) return;
        setSwitching(true);
        axios
            .post(route("set-branch"), { branch_id: branchId })
            .then(() => window.location.reload())
            .catch(() => setSwitching(false));
    };

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger disabled={switching}>
                <button
                    type="button"
                    className={`inline-flex items-center gap-2 h-8 px-3 text-sm font-medium bg-white border rounded-button border-ash text-charcoal hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-electric/30 ${
                        fullWidth ? "w-full justify-between" : "max-w-[180px] lg:max-w-[240px]"
                    }`}
                    aria-label="Cambiar sucursal"
                >
                    <LuStore className="w-4 h-4 text-fog shrink-0" />
                    <span className="truncate">
                        {switching ? "Cambiando..." : currentBranch?.name ?? "Seleccionar sucursal"}
                    </span>
                    <LuChevronsUpDown className="w-3.5 h-3.5 text-fog shrink-0" />
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" variant="soft" color="gray" sideOffset={6}>
                <DropdownMenu.Label>Sucursal</DropdownMenu.Label>
                {branches.map((branch) => (
                    <DropdownMenu.Item key={branch.id} onSelect={() => handleSelect(branch.id)}>
                        <span className="flex items-center justify-between w-full gap-6">
                            {branch.name}
                            {branch.id === currentBranch?.id && <LuCheck className="w-4 h-4 text-electric" />}
                        </span>
                    </DropdownMenu.Item>
                ))}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
};
