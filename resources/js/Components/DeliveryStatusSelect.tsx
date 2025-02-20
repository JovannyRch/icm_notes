import { DELIVERY_STATUS_OPTIONS, SUPPLIED_STATUS_OPTIONS } from "@/const";
import { Box, Flex } from "@radix-ui/themes";
import InputLabel from "./InputLabel";
import { TbTruckDelivery } from "react-icons/tb";

interface DeliveryStatusSelectProps {
    value: string;
    onChange: (value: string) => void;
}

export const DeliveryStatusSelect = ({
    value,
    onChange,
}: DeliveryStatusSelectProps) => {
    return (
        <Box className="">
            <Flex gap="2" align="center">
                <InputLabel
                    htmlFor="delivery_status"
                    value="Estatus de entrega"
                />
                <TbTruckDelivery className="w-5 h-5 text-orange-600" />
            </Flex>
            <select
                className="w-full h-10 mt-1 border border-gray-300 rounded-lg"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                }}
            >
                {DELIVERY_STATUS_OPTIONS.map((group) => (
                    <option key={group.value} value={group.value}>
                        {group.label}
                    </option>
                ))}
            </select>
        </Box>
    );
};
