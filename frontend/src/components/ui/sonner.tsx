import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"
import { useState, useEffect } from "react"
import { getLanguage, getToastPosition } from "@/lib/toast"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const [position, setPosition] = useState<'bottom-left' | 'bottom-right'>(getToastPosition())

  // Listen for language changes in localStorage
  useEffect(() => {
    // Update position based on current language
    setPosition(getToastPosition())

    // Listen for storage events (when language changes in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'nazim-language') {
        setPosition(getToastPosition())
      }
    }

    // Listen for custom language change events (same tab)
    const handleLanguageChange = () => {
      setPosition(getToastPosition())
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('languageChange', handleLanguageChange)

    // Also poll for changes since localStorage doesn't fire events in same tab
    const interval = setInterval(() => {
      const newPosition = getToastPosition()
      setPosition(prev => prev !== newPosition ? newPosition : prev)
    }, 500)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('languageChange', handleLanguageChange)
      clearInterval(interval)
    }
  }, [])

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={position}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
