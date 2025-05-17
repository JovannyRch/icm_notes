import { Corte } from "./Corte";

export interface CorteSemanal {
    id?: number;
    fecha_inicio: string;
    fecha_fin: string;
    venta_total: number;
    restan_notas: number;
    transferencias: number;
    entradas: number;
    gastos: number;
    efectivo: number;
    material: number;
    sueldos: number;
    gastos_extra_total: number;
    porcentaje: number;
    gastos_extra: ExpenseInput[];
    cortes: Partial<Corte>[];
    branch_id: number;
    created_at: string;
    updated_at: string;
}
