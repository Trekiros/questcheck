import { ComponentProps, FC, useEffect, useRef } from "react";

const AutoResizeTextArea: FC<ComponentProps<"textarea">> = (props) => {
    const ref = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (!ref.current) return;

        // Reset height (without this, scrollheight won't be accurate)
        ref.current.style.height = "0px";
        const scrollHeight = ref.current.scrollHeight;

        // Set new height
        ref.current.style.height = scrollHeight + "px";
      }, [ref.current, props.value]);

    return (
        <textarea
            {...props}
            style={{ ...(props.style || {}), resize: 'none' }}
            ref={ref}
        />
    )
}

export default AutoResizeTextArea