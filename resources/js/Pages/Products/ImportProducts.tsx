import { useForm } from "@inertiajs/react";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import { FaFileExcel } from "react-icons/fa6";
import { useFilePicker } from "use-file-picker";
import { Button } from "@radix-ui/themes";
import { MdUploadFile } from "react-icons/md";
import { BiDownload } from "react-icons/bi";
import { useBranch } from "@/hooks/useBranch";

const ImportProducts = () => {
    const [open, setOpen] = useState(false);
    const { currentBranchName } = useBranch();

    const { setData, post, processing, errors } = useForm({
        file: null,
    });

    const { openFilePicker, filesContent, loading, clear } = useFilePicker({
        accept: ".xls,.xlsx",
        onFilesSelected: ({ plainFiles }) => {
            if (plainFiles.length === 0) {
                return;
            }
            setData("file", plainFiles[0]);
        },
    });

    const handleDownloadTemplate = () => {
        const templatePath = "/templates/template_productos.xlsx";
        window.open(templatePath, "_blank");
    };

    const handleProcess = () => {
        if (filesContent.length === 0) {
            return;
        }

        post(route("import.products"), {
            onFinish: () => {
                setOpen(false);
            },
        });
    };

    useEffect(() => {
        if (open) {
            setData("file", null);
            clear();
        }
    }, [open]);

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <Button variant="outline" color="gray" onClick={() => setOpen(true)}>
                    <FaFileExcel />
                    Importar
                </Button>
            </Dialog.Trigger>

            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
                <Dialog.Content className="fixed z-50 w-[min(92vw,520px)] p-6 -translate-x-1/2 -translate-y-1/2 bg-white border top-1/2 left-1/2 rounded-card-lg border-ash shadow-popover">
                    <Dialog.Title className="flex items-center justify-between gap-3 text-lg font-semibold text-charcoal">
                        <div className="flex items-center gap-1">
                            Importar Productos
                        </div>
                        <div>
                            <button
                                onClick={handleDownloadTemplate}
                                className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium bg-white border rounded-button border-ash text-charcoal hover:bg-paper"
                            >
                                <div>Descargar template</div>
                                <BiDownload />
                            </button>
                        </div>
                    </Dialog.Title>

                    <ul className="mt-3 space-y-1 text-sm list-disc pl-5 text-steel">
                        <li>
                            Si un producto ya existe (misma marca, modelo, medida y MC) se <b>actualiza</b>; no se duplica.
                            Las celdas vacías no borran datos.
                        </li>
                        <li>
                            La columna <b>EXISTENCIAS</b> fija las existencias de <b>{currentBranchName}</b> (conteo físico).
                            Déjala vacía para no tocarlas.
                        </li>
                        <li>Tip: exporta el catálogo, captura tu conteo en EXISTENCIAS y vuelve a importarlo.</li>
                    </ul>

                    <div className="min-h-[140px] mt-4 border border-dashed rounded-card border-pebble bg-[#fafafa]">
                        {filesContent.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 h-full min-h-[140px]">
                                <button
                                    onClick={openFilePicker}
                                    disabled={loading}
                                    className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium bg-white border rounded-button border-ash text-charcoal hover:bg-paper disabled:opacity-50"
                                >
                                    {loading
                                        ? "Cargando..."
                                        : "Seleccionar archivo"}
                                    <MdUploadFile />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center min-h-[140px] flex-col">
                                <h2 className="text-sm font-semibold text-charcoal">
                                    Archivo Seleccionado
                                </h2>
                                <p className="text-sm text-fog">
                                    {filesContent[0].name}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 mt-5">
                        {filesContent.length > 0 && (
                            <button
                                disabled={processing}
                                onClick={handleProcess}
                                className="inline-flex items-center h-9 px-4 text-sm font-medium text-white rounded-button bg-sapphire hover:bg-blue-900 disabled:opacity-50"
                            >
                                {processing ? (
                                    <div className="flex items-center gap-1">
                                        Procesando...
                                        <svg
                                            className="w-4 h-4 animate-spin"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeDasharray="31.41592653589793"
                                                strokeDashoffset="0"
                                            ></circle>
                                        </svg>
                                    </div>
                                ) : (
                                    "Procesar"
                                )}
                            </button>
                        )}
                        <Dialog.Close asChild>
                            <button className="inline-flex items-center h-9 px-4 text-sm font-medium bg-white border rounded-button border-ash text-charcoal hover:bg-paper">
                                Cancelar
                            </button>
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default ImportProducts;
