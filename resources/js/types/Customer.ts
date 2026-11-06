/** Un cliente ya capturado antes (en caja o en una nota), para autocompletar. */
export interface CustomerMatch {
    customer: string;
    customer_phone: string | null;
    customer_address: string | null;
}
