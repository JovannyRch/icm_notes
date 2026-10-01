import { useBranchExtra } from "@/hooks/useBranchExtra";
import { useForm } from "@inertiajs/react";
import { Button, Dialog, Flex, Text } from "@radix-ui/themes";
import { useState } from "react";
import { MdPercent } from "react-icons/md";

/**
 * Configura el extra (%) global de la sucursal activa. Cuando está definido,
 * reemplaza el extra de cada producto en las notas nuevas de esa sucursal.
 */
const BranchExtraDialog = () => {
    const { branch, globalExtra } = useBranchExtra();
    const [open, setOpen] = useState(false);

    const { data, setData, put, processing, errors, clearErrors, transform } =
        useForm({ extra_percentage: globalExtra === null ? "" : String(globalExtra) });

    if (!branch) return null;

    const openDialog = () => {
        setData("extra_percentage", globalExtra === null ? "" : String(globalExtra));
        clearErrors();
        setOpen(true);
    };

    const save = (value: string | null) => {
        transform(() => ({ extra_percentage: value === "" ? null : value }));
        put(route("branches.extra.update", branch.id), {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Button
                type="button"
                variant="soft"
                color={globalExtra === null ? "gray" : "violet"}
                className="hover:cursor-pointer"
                onClick={openDialog}
            >
                {globalExtra === null
                    ? "Extra global: sin definir"
                    : `Extra global: ${globalExtra}%`}
                <MdPercent />
            </Button>

            <Dialog.Content maxWidth="460px">
                <Dialog.Title>Extra global de {branch.name}</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    Se aplica a <b>todos los productos</b> al agregarlos a una
                    nota de esta sucursal, en lugar del extra de cada producto.
                    Las notas ya guardadas no cambian.
                </Dialog.Description>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        save(data.extra_percentage);
                    }}
                >
                    <label htmlFor="extra_percentage" className="block mb-1 text-sm font-medium text-gray-700">
                        Porcentaje extra
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            id="extra_percentage"
                            type="number"
                            min="0"
                            max="1000"
                            step="0.01"
                            autoFocus
                            placeholder="Ej. 10"
                            value={data.extra_percentage}
                            onChange={(e) => setData("extra_percentage", e.target.value)}
                            className="w-40 px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <span className="text-gray-600">%</span>
                    </div>
                    {errors.extra_percentage && (
                        <p className="mt-1 text-sm text-red-600">{errors.extra_percentage}</p>
                    )}
                    <Text as="p" size="1" color="gray" mt="2">
                        Déjalo vacío o usa “Quitar” para volver a usar el extra de cada producto.
                    </Text>

                    <Flex gap="2" mt="5" justify="between">
                        <Button
                            type="button"
                            variant="soft"
                            color="red"
                            disabled={processing || globalExtra === null}
                            className="hover:cursor-pointer"
                            onClick={() => save(null)}
                        >
                            Quitar extra global
                        </Button>
                        <Flex gap="2">
                            <Dialog.Close>
                                <Button type="button" variant="soft" color="gray" className="hover:cursor-pointer">
                                    Cancelar
                                </Button>
                            </Dialog.Close>
                            <Button type="submit" disabled={processing} className="hover:cursor-pointer">
                                {processing ? "Guardando..." : "Guardar"}
                            </Button>
                        </Flex>
                    </Flex>
                </form>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default BranchExtraDialog;
