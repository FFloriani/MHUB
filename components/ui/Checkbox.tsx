import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, ...props }, ref) => {
    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          className="sr-only"
          {...props}
        />
        <div
          className={cn(
            'w-5 h-5 border-2 rounded border-gray-300 flex items-center justify-center transition-colors',
            checked && 'bg-primary border-primary',
            !checked && 'bg-white hover:border-gray-400',
            className
          )}
        >
          {checked && <Check className="w-3 h-3 text-white" />}
        </div>
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export default Checkbox

