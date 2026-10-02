/**
 * Imprime el ticket de una nota sin salir de la pantalla: lo carga en un iframe oculto
 * y la página del ticket llama a print() al terminar de cargar. En la computadora de
 * caja, Chrome abierto con --kiosk-printing lo manda directo a la Epson (sin diálogo).
 */
export function printTicket(url: string) {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
    frame.src = url;
    document.body.appendChild(frame);
    // Tiempo de sobra para el diálogo de impresión (si no hay modo kiosco) antes de quitarlo.
    window.setTimeout(() => frame.remove(), 120_000);
}

const AUTO_PRINT_KEY = "caja-auto-print";

/** ¿Imprimir solo al cobrar? Se recuerda por computadora (por omisión, sí). */
export function getAutoPrint(): boolean {
    try {
        return localStorage.getItem(AUTO_PRINT_KEY) !== "0";
    } catch {
        return true;
    }
}

export function setAutoPrint(value: boolean) {
    try {
        localStorage.setItem(AUTO_PRINT_KEY, value ? "1" : "0");
    } catch {
        // sin localStorage: queda sólo para esta visita
    }
}
