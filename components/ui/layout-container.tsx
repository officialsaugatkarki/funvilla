import { ReactNode } from 'react'

interface LayoutContainerProps {
  children: ReactNode
  className?: string
}

export function LayoutContainer({ children, className = '' }: LayoutContainerProps) {
  return (
    <div className={`w-full px-4 sm:px-6 md:px-8 lg:px-12 2xl:px-12 ${className}`}>
      {children}
    </div>
  )
}
