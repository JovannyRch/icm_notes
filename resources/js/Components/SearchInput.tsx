interface SearchInputProps {
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

const SearchInput = ({
    value,
    onChange,
    placeholder,
    className = "",
}: SearchInputProps) => {
    return (
        <div className={className}>
            <label className="mb-2 text-sm font-medium text-charcoal sr-only ">
                Search
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 flex items-center pointer-events-none start-0 ps-3">
                    <svg
                        className="w-4 h-4 text-fog"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 20"
                    >
                        <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                        />
                    </svg>
                </div>
                <input
                    type="search"
                    id="default-search"
                    className="block w-full h-9 text-sm bg-white ps-9"
                    placeholder={placeholder ?? "Buscar ..."}
                    onChange={(e) => onChange(e.target.value)}
                    value={value}
                />
            </div>
        </div>
    );
};

export default SearchInput;
