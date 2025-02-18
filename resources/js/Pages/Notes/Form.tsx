import Container from "@/Components/Container";
import ContainerSection from "@/Components/ContainerSection";
import InputWithLabel from "@/Components/InputWithLabel";
import LineDivider from "@/Components/LineDivider";
import NoteItem from "@/Components/NoteItem";
import ProductsModal from "@/Components/ProductsModal/ProductsModal";
import { formatCurrency } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { Branch } from "@/types/Branch";
import { Note } from "@/types/Note";
import { NoteItemInterface } from "@/types/NoteItem";
import { router, useForm } from "@inertiajs/react";
import {
    Box,
    Button,
    Flex,
    Grid,
    Strong,
    Text,
    TextArea,
} from "@radix-ui/themes";
import { useEffect, useMemo, useState } from "react";
import { BiArrowBack, BiPlus } from "react-icons/bi";

import { MdSave } from "react-icons/md";
import { TbTrash } from "react-icons/tb";

interface Props extends PageProps {
    branch: Branch;
    note?: Note;
}

const defaultItem: NoteItemInterface = {
    type: "",
    brand: "",
    model: "",
    measure: "",
    description: "",
    caja_bulto: "",
    cost: 0,
    iva: 16,
    commission: 0,
    stock: 0,
    quantity: 0,
    subtotal: 0,
    code: "",
};

const NoteForm = ({ branch, note, flash }: Props) => {
    const isEdit = !!note;

    useAlerts(flash);

    const [items, setItems] = useState<NoteItemInterface[]>([defaultItem]);

    const [modalValues, setModalValues] = useState<{
        mode: "append" | "replace";
        open: boolean;
    }>({
        mode: "append",
        open: false,
    });

    const [selectedProductIndex, setSelectedProductIndex] = useState(0);

    const {
        data,
        setData,
        errors,
        post,
        put,
        delete: deleteNote,
    } = useForm({
        folio: isEdit ? note?.folio : "",
        customer: isEdit ? note?.customer : "",
        notes: isEdit ? note?.notes : "",
        total: String(isEdit ? note?.total : 0),
        advance: String(isEdit ? note?.advance : ""),
        branch_id: branch.id,
        date: isEdit ? note?.date : new Date().toISOString().split("T")[0],
    });

    const handleOnSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (isEdit) {
            put(route("notes.update", note?.id));
        } else {
            post(route("notes.store"));
        }
    };

    const handleDelete = () => {
        if (confirm("¿Estás seguro de eliminar esta nota?")) {
            deleteNote(route("notes.destroy", note?.id));
        }
    };

    const total = useMemo(() => {
        return items.reduce((acc, item) => acc + item.subtotal, 0);
    }, [items]);

    return (
        <Container title={isEdit ? "Editar nota" : "Nueva nota"}>
            <form onSubmit={handleOnSubmit}>
                <Box className="mb-4">
                    <Flex gap="2" justify="between">
                        <Flex gap="2">
                            <Button
                                type="button"
                                color="gray"
                                className="btn btn-secondary"
                                onClick={() => {
                                    router.visit(
                                        route("branches.notes", branch.id)
                                    );
                                }}
                            >
                                Regresar a la lista
                                <BiArrowBack />
                            </Button>
                            {isEdit && (
                                <>
                                    <Button
                                        type="button"
                                        color="red"
                                        className="btn btn-secondary"
                                        onClick={handleDelete}
                                    >
                                        Eliminar nota
                                        <TbTrash />
                                    </Button>
                                    <Button
                                        color="green"
                                        type="button"
                                        onClick={() => {
                                            router.visit(
                                                route("notes.create", {
                                                    branch: branch.id,
                                                })
                                            );
                                        }}
                                    >
                                        Nueva nota
                                        <BiPlus />
                                    </Button>
                                </>
                            )}
                        </Flex>
                        <Flex gap="2">
                            <Button type="submit" className="btn btn-primary">
                                {isEdit ? "Actualizar nota" : "Guardar nota"}
                                <MdSave />
                            </Button>
                        </Flex>
                    </Flex>
                </Box>

                <Grid columns="8" gap="2">
                    <Grid gridColumn="span 6">
                        <ContainerSection title="Detalles de la nota">
                            <Grid columns="3" gap="3">
                                <Grid gridColumn="span 3">
                                    <InputWithLabel
                                        label="Sucursal"
                                        name="branch"
                                        value={branch.name}
                                        readonly
                                    />
                                </Grid>

                                <Grid gridColumn="span 1">
                                    <InputWithLabel
                                        label="No. Nota"
                                        name="note_number"
                                        type="text"
                                        value={data.folio}
                                        onChange={(e) =>
                                            setData("folio", e.target.value)
                                        }
                                        error={errors.folio}
                                    />
                                </Grid>

                                <Grid gridColumn="span 1">
                                    <InputWithLabel
                                        label="A la cuenta"
                                        name="advance"
                                        type="text"
                                        value={String(data.advance)}
                                        onChange={(e) =>
                                            setData(
                                                "advance",
                                                isNaN(Number(e.target.value))
                                                    ? "0"
                                                    : e.target.value
                                            )
                                        }
                                        error={errors.advance}
                                    />
                                </Grid>
                                <Grid gridColumn="span 1">
                                    <InputWithLabel
                                        label="Fecha"
                                        name="date"
                                        type="date"
                                        value={String(data.date)}
                                        onChange={(e) =>
                                            setData("date", e.target.value)
                                        }
                                        error={errors.date}
                                    />
                                </Grid>
                                <Grid gridColumn="span 3">
                                    <InputWithLabel
                                        label="Cliente"
                                        name="customer"
                                        type="text"
                                        value={data.customer}
                                        onChange={(e) =>
                                            setData("customer", e.target.value)
                                        }
                                        error={errors.customer}
                                    />
                                </Grid>
                            </Grid>
                        </ContainerSection>

                        <ContainerSection title="Productos" className="pt-8">
                            <>
                                {items.map((item, index) => (
                                    <div key={`item-${index}`}>
                                        <NoteItem
                                            item={item}
                                            index={index}
                                            onDelete={(index: number) => {
                                                setItems(
                                                    items.filter(
                                                        (_, i) => i !== index
                                                    )
                                                );
                                            }}
                                            onOpenSearchModal={(position) => {
                                                setSelectedProductIndex(
                                                    position
                                                );
                                                setModalValues({
                                                    mode: "replace",
                                                    open: true,
                                                });
                                            }}
                                            onUpdate={(index, item) => {
                                                setItems(
                                                    items.map((i, idx) =>
                                                        idx === index ? item : i
                                                    )
                                                );
                                            }}
                                        />
                                        <LineDivider className="my-5" />
                                    </div>
                                ))}
                                <div className="mt-4">
                                    <Grid columns="9">
                                        <Grid gridColumn="span 1"></Grid>
                                        <Grid gridColumn="span 8">
                                            <div>
                                                <Button
                                                    type="button"
                                                    onClick={() => {
                                                        setItems((prev) => [
                                                            ...prev,
                                                            defaultItem,
                                                        ]);
                                                        setSelectedProductIndex(
                                                            items.length
                                                        );
                                                    }}
                                                >
                                                    Agregar producto <BiPlus />
                                                </Button>
                                            </div>
                                        </Grid>
                                    </Grid>
                                </div>
                            </>
                        </ContainerSection>
                    </Grid>
                    <Grid gridColumn="span 2">
                        <div className="flex flex-col justify-start">
                            <ContainerSection title="Notas">
                                <TextArea
                                    value={data.notes}
                                    onChange={(e) =>
                                        setData("notes", e.target.value)
                                    }
                                    rows={5}
                                    className="w-full"
                                />
                            </ContainerSection>
                            <ContainerSection title="Total">
                                <Flex
                                    gap="2"
                                    justify="between"
                                    className="mb-2"
                                    align="center"
                                >
                                    <Text size="3">Anticipo:</Text>
                                    <Text size="3" weight="bold">
                                        {formatCurrency(Number(data.advance))}
                                    </Text>
                                </Flex>
                                <LineDivider />
                                <Flex
                                    gap="2"
                                    justify="between"
                                    className="my-2"
                                    align="center"
                                >
                                    <Text size="3">Restan:</Text>
                                    <Text size="3" weight="bold">
                                        {formatCurrency(
                                            Number(total) - Number(data.advance)
                                        )}
                                    </Text>
                                </Flex>
                                <LineDivider />
                                <Flex
                                    gap="2"
                                    justify="between"
                                    className="mt-2"
                                    align="center"
                                >
                                    <Text size="4">
                                        <Strong>Total: </Strong>
                                    </Text>
                                    <Text size="4" weight="bold">
                                        {formatCurrency(Number(total))}
                                    </Text>
                                </Flex>
                            </ContainerSection>
                        </div>
                    </Grid>
                </Grid>
            </form>
            <ProductsModal
                onClose={() => setModalValues({ ...modalValues, open: false })}
                open={modalValues.open}
                mode={modalValues.mode}
                onAddProduct={(product) => {
                    setItems((prev) => [
                        ...prev,
                        {
                            ...product,
                            type: product.type,
                            code: product.code,
                            brand: product.brand,
                            model: product.model,
                            measure: product.measure,
                            description: product.description,
                            caja_bulto: product.caja_bulto,
                            cost: product.cost,
                            iva: product.iva,
                            commission: product.commission,
                            stock: product.stock,
                            quantity: 1,
                        },
                    ]);
                }}
                onReplaceProduct={(product) => {
                    setItems(
                        items.map((item, index) =>
                            index === selectedProductIndex
                                ? {
                                      ...item,
                                      type: product.type,
                                      code: product.code,
                                      brand: product.brand,
                                      model: product.model,
                                      measure: product.measure,
                                      description: product.description,
                                      caja_bulto: product.caja_bulto,
                                      cost: product.cost,
                                      iva: product.iva,
                                      commission: product.commission,
                                      stock: product.stock,
                                  }
                                : item
                        )
                    );
                }}
            />
        </Container>
    );
};

export default NoteForm;
