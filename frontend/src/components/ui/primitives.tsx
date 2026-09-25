import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Check, CircleAlert } from 'lucide-react'
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
 return <div className="page-heading">{eyebrow && <div className="eyebrow">{eyebrow}</div>}<div className="heading-row"><div><h1 tabIndex={-1}>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</div></div>
}
export function LinkButton({ to, children, variant = 'primary', className = '' }: { to: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; className?: string }) { return <Link className={`btn btn-${variant} ${className}`} to={to}>{children}</Link> }
export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor: string }) { return <div className="field"><label htmlFor={htmlFor}>{label}</label>{children}{hint && <p id={`${htmlFor}-hint`} className="field-hint">{hint}</p>}{error && <p className="field-error" id={`${htmlFor}-error`}>{error}</p>}</div> }
export function Badge({ children = 'Завершён', tone = 'success' }: { children?: ReactNode; tone?: 'success' | 'warning' | 'danger' | 'neutral' }) { return <span className={`badge badge-${tone}`}>{tone === 'success' ? <Check size={12} /> : tone !== 'neutral' ? <CircleAlert size={12} /> : null}{children}</span> }
export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) { return <div className="section-heading"><h2>{children}</h2>{aside}</div> }
export function OpenLink({ to, label = 'Открыть', name }: { to: string; label?: string; name?: string }) { return <Link className="open-link" to={to} aria-label={name ? `${label}: ${name}` : undefined}>{label}<ArrowUpRight size={15} /></Link> }
export function Description({ children }: { children: ReactNode }) { const id = useId(); return <p id={id} className="muted">{children}</p> }
