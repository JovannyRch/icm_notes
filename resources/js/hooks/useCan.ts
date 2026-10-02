import { PageProps } from "@/types";
import { usePage } from "@inertiajs/react";

/**
 * ¿El usuario tiene el permiso? Para mostrar u ocultar navegación y botones.
 * El servidor valida cada ruta por su cuenta: ocultar algo aquí no es la protección.
 */
export function useCan() {
    const { permissions = [] } = usePage<PageProps>().props;
    return (ability: string) => permissions.includes(ability);
}
