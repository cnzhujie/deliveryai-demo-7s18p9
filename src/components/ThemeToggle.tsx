import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { Theme } from '@/hooks/useTheme'

interface ThemeToggleProps { theme: Theme; onToggle: () => void; floating?: boolean }

export function ThemeToggle({ theme, onToggle, floating = false }: ThemeToggleProps) {
  const { t } = useTranslation()
  const dark = theme === 'dark'
  const label = t(dark ? 'common.aria_light_theme' : 'common.aria_dark_theme')
  return (
    <Button type="button" variant="outline" size="icon" onClick={onToggle} aria-label={label} title={label} className={floating ? 'fixed right-4 top-4 z-40 rounded-full shadow-card' : undefined}>
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </Button>
  )
}
