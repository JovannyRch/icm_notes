import InputWithLabel from "@/Components/InputWithLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import { Product } from "@/types/Product";
import { router, useForm } from "@inertiajs/react";
import { BiSave } from "react-icons/bi";
import { MdClose } from "react-icons/md";

interface StockMovementFormProps {
    product: Product;
    onClose: () => void;
}

type MovementType = "IN" | "OUT" | "ADJUSTMENT";

const movementTypeLabels = {
    IN: "Entrada",
    OUT: "Salida",
    ADJUSTMENT: "Ajuste",
};

const StockMovementForm = ({ product, onClose }: StockMovementFormProps) => {
    const { data, setData, errors, post, processing } = useForm({
        product_id: product.id,
        movement_type: "IN" as MovementType,
        quantity: "",
        description: "",
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post(route("stock-movements.store"), {
            onSuccess: () => {
                router.reload();
                onClose();
            },
        });
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-charcoal">
                    Nuevo movimiento de inventario
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar"
                    className="p-1 rounded-button text-fog hover:text-charcoal hover:bg-paper"
                >
                    <MdClose className="w-6 h-6" />
                </button>
            </div>

            <div className="p-3 mb-4 space-y-0.5 rounded-card bg-paper">
                <p className="text-sm text-steel">
                    <strong>Producto:</strong> {product.brand} {product.model}
                </p>
                <p className="text-sm text-steel">
                    <strong>Existencias actuales:</strong>{" "}
                    {product.stock?.quantity ?? 0}
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-graphite">
                            Tipo de movimiento
                        </label>
                        <select
                            value={data.movement_type}
                            onChange={(e) =>
                                setData(
                                    "movement_type",
                                    e.target.value as MovementType
                                )
                            }
                            className="w-full px-3 py-2 text-sm bg-white "
                        >
                            <option value="IN">{movementTypeLabels.IN}</option>
                            <option value="OUT">
                                {movementTypeLabels.OUT}
                            </option>
                            <option value="ADJUSTMENT">
                                {movementTypeLabels.ADJUSTMENT}
                            </option>
                        </select>
                        {errors.movement_type && (
                            <p className="mt-1 text-sm text-red-600">
                                {errors.movement_type}
                            </p>
                        )}
                    </div>

                    <InputWithLabel
                        label="Cantidad"
                        name="quantity"
                        type="number"
                        value={data.quantity}
                        onChange={(e) => setData("quantity", e.target.value)}
                        error={errors.quantity}
                    />

                    <div>
                        <label className="block mb-2 text-sm font-medium text-graphite">
                            Descripción
                        </label>
                        <textarea
                            name="description"
                            value={data.description}
                            onChange={(e) =>
                                setData("description", e.target.value)
                            }
                            className="w-full px-3 py-2 text-sm bg-white "
                            rows={3}
                            placeholder="Ingrese una descripción opcional del movimiento..."
                        />
                        {errors.description && (
                            <p className="mt-1 text-sm text-red-600">
                                {errors.description}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <SecondaryButton onClick={onClose} disabled={processing}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing}>
                            <BiSave className="w-4 h-4" />
                            {processing ? "Guardando..." : "Guardar movimiento"}
                        </PrimaryButton>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default StockMovementForm;
