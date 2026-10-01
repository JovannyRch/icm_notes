import { DELIVERY_STATUS_OPTIONS, STATUS_DELIVERY_ENUM } from "@/const";
import { Box, Flex } from "@radix-ui/themes";
import InputLabel from "./InputLabel";
import { FiPackage } from "react-icons/fi";

interface DeliveryStatusSelectProps {
    value: string;
    onChange: (value: string) => void;
    isPaymentComplete?: boolean;
}

export const DeliveryStatusSelect = ({
    value,
    onChange,
    isPaymentComplete = true,
}: DeliveryStatusSelectProps) => {
    return (
        <Box className="">
            <Flex gap="2" align="center" className="pl-2">
                <InputLabel
                    htmlFor="delivery_status"
                    value="Estatus de entrega"
                />
                <FiPackage className="w-4 h-4 text-fog" />
            </Flex>
            <select
                className="block w-full h-9 mt-1 text-sm bg-white"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                }}
            >
                {DELIVERY_STATUS_OPTIONS.map((group) => (
                    <option
                        key={group.value}
                        value={group.value}
                        disabled={
                            group.value === STATUS_DELIVERY_ENUM.DELIVERED &&
                            !isPaymentComplete
                        }
                    >
                        {group.label}
                    </option>
                ))}
            </select>
        </Box>
    );
};
