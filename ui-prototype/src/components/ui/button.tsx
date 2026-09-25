import type { ButtonHTMLAttributes } from 'react'
export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
 return <button data-slot="button" type={type} className={`btn btn-${variant} ${className}`} {...props} />
}
