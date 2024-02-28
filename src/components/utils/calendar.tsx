import { FC } from "react"
import ReactDatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css";
import styles from "./calendar.module.scss"

type PropType = {
    value?: number,
    onChange: (newValue: number|undefined) => void,
    min?: number,
    max?: number,
    placeholder?: string,
}

const Calendar: FC<PropType> = ({ value, onChange, min, max, placeholder }) => {
    return (
        <ReactDatePicker
            calendarClassName={styles.calendar}
            popperClassName={styles.popper}
            dayClassName={date => `${styles.day} ${date.getTime() === value ? styles.active : ""}`}
            className={styles.datePicker}
            timeClassName={date => styles.time}
            monthClassName={date => styles.month}
            clearButtonClassName={styles.clearBtn}
            weekDayClassName={date => styles.weekDay}
            wrapperClassName={styles.wrapper}
            calendarIconClassname={styles.icon}
            

            value={(value === undefined) ? undefined :  new Date(value).toLocaleDateString("en-US", { 
                month: 'short', 
                day: "numeric", 
                year:'numeric' 
            })}
            
            onChange={newValue => onChange(newValue?.getTime())}
            
            minDate={(min === undefined) ? undefined : new Date(min)}
            maxDate={(max === undefined) ? undefined : new Date(max)} 
            placeholderText={placeholder} />
    )
}

export default Calendar