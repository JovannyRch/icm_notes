import { PageProps } from "@/types";
import { usePage } from "@inertiajs/react";

/**
 * Extra (%) global de la sucursal activa. Se lee de los props compartidos de
 * cada respuesta (no de BranchContext, que sólo se carga al arrancar), así un
 * cambio se refleja sin recargar la página.
 */
export function useBranchExtra() {
    const { branches, currentBranch } = usePage<
        PageProps<{ branches: Branch[]; currentBranch: number | null }>
    >().props;

    const branch = branches.find((b) => b.id === Number(currentBranch));
    const extra = branch?.extra_percentage;

    return {
        branch,
        /** null cuando la sucursal no tiene extra global */
        globalExtra: extra === null || extra === undefined ? null : Number(extra),
    };
}
