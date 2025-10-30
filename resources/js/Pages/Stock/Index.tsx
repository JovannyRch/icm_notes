// resources/js/Pages/Stock/Index.tsx
import Container from "@/Components/Container";
import { Input } from "@headlessui/react";
import { useForm } from "@inertiajs/react";
import { Button } from "@radix-ui/themes";

interface StockIndexProps {
    stocks: Array<any>;
    products: Array<any>;
}
export default function StockIndex({
    stocks = [],
    products = [],
}: StockIndexProps) {
    const { data, setData, post } = useForm({
        product_id: "",
        quantity: "",
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post(route("stock.store"));
    };

    return (
        <Container>
            <div style={{ minHeight: "calc(100vh - 130px)" }}>
                <h1 className="mb-4 text-xl font-bold">
                    Gestión de Existencias
                </h1>

                <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
                    <select
                        value={data.product_id}
                        onChange={(e) => setData("product_id", e.target.value)}
                        className="p-2 border rounded"
                    >
                        <option value="">Selecciona producto</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.model}
                            </option>
                        ))}
                    </select>

                    <Input
                        type="number"
                        placeholder="Cantidad"
                        value={data.quantity}
                        onChange={(e) => setData("quantity", e.target.value)}
                    />

                    <Button type="submit">Agregar entrada</Button>
                </form>

                <table className="w-full border">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Modelo</th>
                            <th>Existencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stocks.map((s) => (
                            <tr key={s.id}>
                                <td>{s.product.id}</td>
                                <td>{s.product.model}</td>
                                <td>{Number(s.quantity)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Container>
    );
}
