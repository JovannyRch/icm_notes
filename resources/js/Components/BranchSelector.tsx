import React from "react";
import { router } from "@inertiajs/react";
import { textWithEllipsis } from "@/helpers/utils";
import { useBranch } from "@/hooks/useBranch";
import axios from "axios";
import { useLocalStorage } from "usehooks-ts";

interface Branch {
    id: number | string;
    name: string;
}

export const BranchSelector: React.FC = () => {
    const [open, setOpen] = React.useState(false);
    const { branches, currentBranch } = useBranch();

    const handleSelect = (branch: Branch) => {
        axios.post(route("set-branch"), { branch_id: branch.id }).then(() => {
            window.location.reload();
        });
    };

    return (
        <div className="flex items-center h-full">
            <div className="relative">
                <button
                    onClick={() => setOpen((prev) => !prev)}
                    className="flex items-center justify-between w-48 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
                >
                    <span>
                        {textWithEllipsis(currentBranch?.name ?? "") ??
                            "Seleccionar sucursal"}
                    </span>
                    <svg
                        className={`w-4 h-4 ml-2 transition-transform ${
                            open ? "rotate-180" : "rotate-0"
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </button>

                {open && (
                    <div className="absolute left-0 z-20 w-48 mt-2 bg-white border border-gray-200 rounded-md shadow-lg">
                        {branches.map((branch) => (
                            <button
                                key={branch.id}
                                onClick={() => handleSelect(branch)}
                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 ${
                                    branch.id === currentBranch?.id
                                        ? "bg-indigo-100 font-medium"
                                        : "text-gray-700"
                                }`}
                            >
                                {branch.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
