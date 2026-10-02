export type Role = "super_admin" | "owner" | "cashier";

export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    role: Role;
    active: boolean;
}

export interface BillingStatus {
    state: "ok" | "due" | "overdue";
    pending: string[]; // YYYY-MM
    due_date: string | null; // YYYY-MM-DD
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>
> = T & {
    auth: {
        user: User;
    };
    flash: {
        success?: string;
        error?: string;
        warning?: string;
    };
    billing: BillingStatus | null;
    canManageBilling: boolean;
    /** Permisos concedidos (config/permissions.php). Sólo presentación: el servidor valida. */
    permissions: string[];
    /** Super admin que está viendo el sistema "como" este usuario. */
    impersonator: { id: number; name: string } | null;
};

export type payment_status = "pending" | "paid" | "canceled";
