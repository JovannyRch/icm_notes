import { Link } from "@inertiajs/react";
import React from "react";

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginationProps = {
    current_page: number;
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
    links: PaginationLink[];
};

interface Props {
    pagination: PaginationProps;
}

const Pagination: React.FC<Props> = ({ pagination }) => {
    const { links, current_page } = pagination;

    if (links.length <= 1) {
        return null;
    }

    return (
        <nav className="flex items-center justify-center mt-6">
            <ul className="flex space-x-1">
                {links.map((link, index) => {
                    const isActive = link.active;
                    const isDisabled = link.url === null;

                    return (
                        <li key={index}>
                            {isDisabled ? (
                                <span
                                    className={`px-3 py-1 border rounded text-gray-400 bg-gray-100 cursor-not-allowed select-none`}
                                    dangerouslySetInnerHTML={{
                                        __html: link.label,
                                    }}
                                />
                            ) : (
                                <Link
                                    href={link.url || "#"}
                                    className={`px-3 py-1 border rounded hover:bg-gray-200 transition-colors duration-200 ${
                                        isActive
                                            ? "bg-[#3358D4] text-white border-[#3358D4]"
                                            : "bg-white text-gray-700 border-gray-300"
                                    }`}
                                    dangerouslySetInnerHTML={{
                                        __html: link.label,
                                    }}
                                />
                            )}
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default Pagination;
