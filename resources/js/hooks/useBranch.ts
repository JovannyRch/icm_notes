import { PageProps } from "@/types";
import { usePage } from "@inertiajs/react";

/**
 * Sucursal activa y sucursales del usuario, desde los props compartidos de la página
 * actual (HandleInertiaRequests::share). Antes se leían de BranchContext, que se carga
 * una sola vez al arrancar: si la app arrancaba en el login (sin usuario), la lista
 * quedaba vacía hasta recargar.
 */
export function useBranch() {
    const { currentBranch, branches = [] } = usePage<PageProps<{ currentBranch: number | null; branches: Branch[] }>>().props;

    const currentBranchData = branches.find((b) => b.id === Number(currentBranch));

    return {
        currentBranchId: Number(currentBranch),
        currentBranchName: currentBranchData?.name ?? "Sin sucursal",
        currentBranch: currentBranchData,
        branches,
        isMultiBranch: branches.length > 1,
    };
}
