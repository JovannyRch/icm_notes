interface TailwindIconButtonProps {
    onClick?: () => void;
    children?: React.ReactNode;
}

const TailwindIconButton = ({ children, onClick }: TailwindIconButtonProps) => {
    return (
        <button
            onClick={onClick}
            type="button"
            className="inline-flex items-center p-2.5 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
            {children}
        </button>
    );
};

export default TailwindIconButton;
