import Container from "@/Components/Container";
import InputWithLabel from "@/Components/InputWithLabel";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { Product } from "@/types/Product";
import { Inertia } from "@inertiajs/inertia";
import { router, useForm } from "@inertiajs/react";
import { Button, Grid } from "@radix-ui/themes";
import { BiSave, BiTrash } from "react-icons/bi";
import { GiCancel } from "react-icons/gi";

interface FormProps extends PageProps {
    product?: Product;
}

const Form = ({ product, flash }: FormProps) => {
    const isEdit = !!product;

    useAlerts(flash);

    const { data, setData, errors, put, post } = useForm({
        brand: product ? product.brand : "",
        model: product ? product.model : "",
        measure: product ? product.measure : "",
        mc: product ? product.mc : "",
        unit: product ? product.unit : "",
        cost: String(product ? product.cost : 0),
        iva: String(product ? product.iva : 16),
        price: String(product ? product.price : 0),
        extra: String(product ? product.extra : 0),
    });

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isEdit) {
            put(route("products.update", product!.id));
        } else {
            post(route("products.store"));
        }
    };

    const handleOnDelete = () => {
        if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
            Inertia.delete(route("products.destroy", product!.id));
        }
    };

    return (
        <Container headTitle={isEdit ? "Editar Producto" : "Nuevo Producto"}>
            <div
                className="max-w-[750px] flex flex-col justify-center"
                style={{ margin: "0 auto", minHeight: "calc(100vh - 155px)" }}
            >
                <div className="flex justify-between ">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {isEdit ? "Editar Producto" : "Nuevo Producto"}
                    </h2>
                    <Button color="red" onClick={handleOnDelete}>
                        Eliminar
                        <BiTrash className="w-4 h-4 " />
                    </Button>
                </div>
                <div className="flex justify-center">
                    <form onSubmit={submit} className="mt-4 ">
                        <Grid gap="4" columns="4" className="w-full" gapY="4">
                            <Grid gridColumn="span 1">
                                <InputWithLabel
                                    label="Marca"
                                    name="brand"
                                    value={data.brand}
                                    onChange={(e) =>
                                        setData("brand", e.target.value)
                                    }
                                    error={errors.brand}
                                />
                            </Grid>

                            <Grid gridColumn="span 4">
                                <InputWithLabel
                                    label="Modelo"
                                    name="model"
                                    value={data.model}
                                    onChange={(e) =>
                                        setData("model", e.target.value)
                                    }
                                    error={errors.model}
                                />
                            </Grid>
                            <Grid gridColumn="span 1">
                                <InputWithLabel
                                    label="Medida"
                                    name="measure"
                                    value={data.measure}
                                    onChange={(e) =>
                                        setData("measure", e.target.value)
                                    }
                                    error={errors.measure}
                                />
                            </Grid>
                            <Grid gridColumn="span 1">
                                <InputWithLabel
                                    label="MC"
                                    name="mc"
                                    value={data.mc}
                                    onChange={(e) =>
                                        setData("mc", e.target.value)
                                    }
                                    error={errors.mc}
                                />
                            </Grid>
                            <Grid gridColumn="span 1">
                                <InputWithLabel
                                    label="Unidad"
                                    name="unit"
                                    value={data.unit}
                                    onChange={(e) =>
                                        setData("unit", e.target.value)
                                    }
                                    error={errors.unit}
                                />
                            </Grid>
                            <Grid gridColumn="span 1">
                                <InputWithLabel
                                    label="Precio ($)"
                                    name="price"
                                    type="text"
                                    value={data.price}
                                    onChange={(e) =>
                                        setData("price", e.target.value)
                                    }
                                    error={errors.price}
                                />
                            </Grid>
                            <Grid gridColumn="span 1">
                                <InputWithLabel
                                    label="Costo ($)"
                                    name="cost"
                                    type="text"
                                    value={data.cost}
                                    onChange={(e) =>
                                        setData("cost", e.target.value)
                                    }
                                    error={errors.cost}
                                />
                            </Grid>
                            <Grid gridColumn="span 1">
                                <InputWithLabel
                                    label="IVA (%)"
                                    name="iva"
                                    type="text"
                                    value={data.iva}
                                    onChange={(e) =>
                                        setData("iva", e.target.value)
                                    }
                                    error={errors.iva}
                                />
                            </Grid>

                            <Grid gridColumn="span 1">
                                <InputWithLabel
                                    label="Extra (%)"
                                    name="extra"
                                    type="text"
                                    value={data.extra}
                                    onChange={(e) =>
                                        setData("extra", e.target.value)
                                    }
                                    error={errors.extra}
                                />
                            </Grid>
                            <Grid gridColumn="span 4" className="pt-4">
                                <div className="flex justify-between">
                                    <Button
                                        type="button"
                                        color="gray"
                                        onClick={() => {
                                            router.visit(route("products"));
                                        }}
                                    >
                                        Cancelar
                                        <GiCancel className="w-4 h-4 " />
                                    </Button>
                                    <Button type="submit" color="green">
                                        {isEdit ? "Actualizar" : "Guardar"}
                                        <BiSave className="w-4 h-4 " />
                                    </Button>
                                </div>
                            </Grid>
                        </Grid>
                    </form>
                </div>
            </div>
        </Container>
    );
};

export default Form;
