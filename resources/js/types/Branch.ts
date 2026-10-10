interface Branch {
    id: number;
    name: string;
    /** Extra (%) global de la sucursal; null = se usa el extra de cada producto. */
    extra_percentage?: number | null;
    /** Corte semanal: la utilidad se reparte al 50% (true) o se muestra completa. */
    weekly_split?: boolean;
    created_at: string;
    updated_at: string;
}
