import InputWithLabel from "@/Components/InputWithLabel";
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
                <h2 className="text-xl font-semibold text-gray-800">
                    Nuevo Movimiento de Inventario
                </h2>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <MdClose className="w-6 h-6" />
                </button>
            </div>

            <div className="mb-4">
                <p className="text-sm text-gray-600">
                    <strong>Producto:</strong> {product.brand} {product.model}
                </p>
                <p className="text-sm text-gray-600">
                    <strong>Existencias actuales:</strong>{" "}
                    {product.stock?.quantity ?? 0}
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                            Descripción
                        </label>
                        <textarea
                            name="description"
                            value={data.description}
                            onChange={(e) =>
                                setData("description", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Ingrese una descripción opcional del movimiento..."
                        />
                        {errors.description && (
                            <p className="mt-1 text-sm text-red-600">
                                {errors.description}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {processing ? "Guardando..." : "Guardar"}
                            <BiSave className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default StockMovementForm;
