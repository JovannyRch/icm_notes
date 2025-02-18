import { useEffect } from "react";
import { toast } from "react-toastify";

interface Alert {
    success?: string | any;
    error?: string | any;
    warning?: string | any;
}

const useAlerts = ({ success, error, warning }: Alert) => {
    useEffect(() => {
        if (success) {
            toast.success(success);
        }
    }, [success]);

    useEffect(() => {
        if (error) {
            toast.error(error);
        }
    }, [error]);

    useEffect(() => {
        if (warning) {
            toast.warning(warning);
        }
    }, [warning]);
};

export default useAlerts;
