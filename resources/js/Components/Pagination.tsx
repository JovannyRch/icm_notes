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
        <nav className="flex items-center justify-center mt-6" aria-label="Paginación">
            <ul className="flex flex-wrap justify-center gap-1">
                {links.map((link, index) => {
                    const isActive = link.active;
                    const isDisabled = link.url === null;

                    return (
                        <li key={index}>
                            {isDisabled ? (
                                <span
                                    className="inline-flex items-center h-8 px-3 text-sm rounded-button text-silver cursor-not-allowed select-none"
                                    dangerouslySetInnerHTML={{
                                        __html: link.label,
                                    }}
                                />
                            ) : (
                                <Link
                                    href={link.url || "#"}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`inline-flex items-center h-8 min-w-8 justify-center px-3 text-sm font-medium rounded-button border transition-colors ${
                                        isActive
                                            ? "bg-ink text-white border-ink"
                                            : "bg-white text-charcoal border-ash hover:bg-paper"
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
