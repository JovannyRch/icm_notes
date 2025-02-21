export enum STATUS_DELIVERY_ENUM {
    DELIVERED = "entregado_a_cliente",
    PAID_TO_SEND = "pagado_x_enviar",
    PAID_TO_PICKUP = "pagador_x_recoger",
    ON_ACCOUNT_TO_SEND = "acuenta_x_enviar",
    ON_ACCOUNT_TO_PICKUP = "acuenta_x_recoger",
    CANCELED = "cancelado",
    PENDING = "pendiente",
}

export const DELIVERY_STATUS_OPTIONS = [
    { value: STATUS_DELIVERY_ENUM.DELIVERED, label: "Entregado a cliente" },
    { value: STATUS_DELIVERY_ENUM.PAID_TO_SEND, label: "Pagado por enviar" },
    {
        value: STATUS_DELIVERY_ENUM.PAID_TO_PICKUP,
        label: "Pagador por recoger",
    },
    {
        value: STATUS_DELIVERY_ENUM.ON_ACCOUNT_TO_SEND,
        label: "A cuenta por enviar",
    },
    {
        value: STATUS_DELIVERY_ENUM.ON_ACCOUNT_TO_PICKUP,
        label: "A cuenta por recoger",
    },
    { value: STATUS_DELIVERY_ENUM.PENDING, label: "Pendiente" },
    { value: STATUS_DELIVERY_ENUM.CANCELED, label: "Cancelado" },
];

export const DELIVERY_STATUS_MAP: Record<string, string> = {
    entregado_a_cliente: "Entregado",
    pagado_x_enviar: "Pagado por enviar",
    pagador_x_recoger: "Pagador por recoger",
    acuenta_x_enviar: "A cuenta por enviar",
    acuenta_x_recoger: "A cuenta por recoger",
    cancelado: "Cancelado",
    pendiente: "Pendiente",
};

export const SUPPLIED_STATUS_OPTIONS = [
    { value: "enviado_a_domicilio", label: "Enviado a domicilio" },
    { value: "enviado_a_sucursal", label: "Enviado a sucursal" },
    { value: "no_enviado", label: "No enviado" },
];

export const SUPPLIED_STATUS_MAP: Record<string, string> = {
    enviado_a_domicilio: "Enviado a domicilio",
    enviado_a_sucursal: "Enviado a sucursal",
    no_enviado: "No enviado",
};
