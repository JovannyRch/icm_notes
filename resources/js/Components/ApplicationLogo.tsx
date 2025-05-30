import { ImgHTMLAttributes } from "react";

export default function ApplicationLogo(
    props: ImgHTMLAttributes<HTMLImageElement>
) {
    return <img src="/img/logo.png" alt="Logo" {...props} />;
}
