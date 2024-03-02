import { faGripVertical } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactNode } from "react";
import { DragDropContext, Draggable, Droppable, resetServerContext } from "react-beautiful-dnd";
import styles from './dragDropList.module.scss'

type PropType<T> = {
    items: T[],
    onReorder: (items: T[]) => void,
    idGetter: (item: T, index: number) => string,
    children: (item: T, index: number) => ReactNode,
    disabled?: boolean,
}

function DragDropList<T>({ items, onReorder, children, idGetter, disabled }: PropType<T>) {
    resetServerContext() // Server side rendering workaround. Not sure about the perfs

    function handleDrop(droppedItem: any) {
        if (disabled) return;

        // Ignore drop outside droppable container
        if (!droppedItem.destination) return;
        const itemsClone = [...items];
        // Remove dragged item
        const [reorderedItem] = itemsClone.splice(droppedItem.source.index, 1);
        // Add dropped item
        itemsClone.splice(droppedItem.destination.index, 0, reorderedItem);
        // Update State
        onReorder(itemsClone);
    }

    return (
        <DragDropContext onDragEnd={handleDrop}>
            <Droppable droppableId="list-container">
                {(provided) => (
                    <div
                        className="list-container"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                    >
                        {items.map((item, index) => (
                            <Draggable key={idGetter(item, index)} draggableId={idGetter(item, index)} index={index}>
                                {(provided) => (
                                    <div
                                        className={`item-container ${styles.itemContainer}`}
                                        ref={disabled ? undefined : provided.innerRef}
                                        {...disabled ? {} : provided.dragHandleProps}
                                        {...disabled ? {} : provided.draggableProps}
                                    >
                                        <FontAwesomeIcon icon={faGripVertical} />
                                        <button className={styles.item}>
                                            {children(item, index)}
                                        </button>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    )
}

export default DragDropList