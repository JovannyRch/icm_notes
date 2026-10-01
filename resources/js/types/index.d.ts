export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
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
};

export type payment_status = "pending" | "paid" | "canceled";
