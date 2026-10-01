interface Branch {
    id: number;
    name: string;
    /** Extra (%) global de la sucursal; null = se usa el extra de cada producto. */
    extra_percentage?: number | null;
    created_at: string;
    updated_at: string;
}
