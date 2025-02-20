import { useForm } from "@inertiajs/react";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import { FaFileExcel } from "react-icons/fa6";
import { useFilePicker } from "use-file-picker";
import { Button } from "@radix-ui/themes";
import { MdUploadFile } from "react-icons/md";
import { BiDownload } from "react-icons/bi";

const ImportProducts = () => {
    const [open, setOpen] = useState(false);

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
                <Button color="teal" onClick={() => setOpen(true)}>
                    Importar Excel
                    <FaFileExcel />
                </Button>
            </Dialog.Trigger>

            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                <Dialog.Content className="fixed p-6 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-md top-1/2 left-1/2 min-w-[30vw]">
                    <Dialog.Title className="flex items-center justify-between gap-1 text-lg font-bold">
                        <div className="flex items-center gap-1">
                            Importar Productos desde Excel <FaFileExcel />
                        </div>
                        <div>
                            <button
                                onClick={handleDownloadTemplate}
                                className="flex items-center gap-1 px-2 py-1 text-sm text-white bg-orange-600 rounded-md"
                            >
                                <div>Descargar template</div>
                                <BiDownload />
                            </button>
                        </div>
                    </Dialog.Title>

                    <div className="min-h-[120px]">
                        {filesContent.length === 0 ? (
                            <div className="flex items-center justify-center h-full  min-h-[120px]">
                                <button
                                    onClick={openFilePicker}
                                    disabled={loading}
                                    className="flex items-center gap-1 px-2 py-1 text-white bg-[#309B8A] rounded-md text-md"
                                >
                                    {loading
                                        ? "Cargando..."
                                        : "Seleccionar archivo"}
                                    <MdUploadFile />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center min-h-[120px] flex-col">
                                <h2 className="text-lg font-semibold">
                                    Archivo Seleccionado
                                </h2>
                                <p className="text-gray-500 text-md">
                                    {filesContent[0].name}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center gap-2 mt-4">
                        {filesContent.length > 0 && (
                            <button
                                disabled={processing}
                                onClick={handleProcess}
                                className="px-2 py-1 text-white bg-[#309B8A] rounded-md text-md"
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
                            <button className="px-2 py-1 text-white bg-[#8B8D98] rounded-md text-md">
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
