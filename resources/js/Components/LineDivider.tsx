const LineDivider = ({ className = "" }: { className?: string }) => {
    return (
        <div className={`flex items-center justify-center w-full ${className}`}>
            <div className="w-full border-t border-gray-300"></div>
        </div>
    );
};

export default LineDivider;
