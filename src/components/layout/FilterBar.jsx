export default function FilterBar({ children, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-[var(--den-gap)] mb-4 ${className}`}>
      {children}
    </div>
  )
}
