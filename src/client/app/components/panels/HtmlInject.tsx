// @ts-nocheck
import { useEffect, useRef } from 'react';
/** Injeta HTML legado reutilizando funções render* existentes. */
export function HtmlInject({ html, className, onClick, onMouseOver, onMouseLeave, }) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.innerHTML = html;
        }
    }, [html]);
    return (<div ref={ref} className={className} onClick={onClick} onMouseOver={onMouseOver} onMouseLeave={onMouseLeave}/>);
}
