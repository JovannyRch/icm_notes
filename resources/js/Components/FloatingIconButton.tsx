import React from "react";

type Position =
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "center";

interface FloatingButtonProps {
    icon: React.ReactNode;
    position?: Position;
    onClick: () => void;
}

const positionClasses: Record<Position, string> = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
    center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
};

const FloatingButton: React.FC<FloatingButtonProps> = ({
    icon,
    position = "bottom-right",
    onClick,
}) => {
    return (
        <button
            className={`fixed z-50 ${positionClasses[position]} bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg transition-colors duration-200`}
            onClick={onClick}
        >
            {icon}
        </button>
    );
};

export default FloatingButton;
