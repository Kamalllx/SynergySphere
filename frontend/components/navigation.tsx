import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Settings, Bell, User } from "lucide-react"
import { Input } from "@/components/ui/input"

interface NavigationProps {
  currentPage?: string
  showSearch?: boolean
  searchPlaceholder?: string
  actionButtons?: React.ReactNode[]
}

function Navigation({
  currentPage,
  showSearch = true,
  searchPlaceholder = "Search...",
  actionButtons,
}: NavigationProps) {
  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-primary">
            SynergySphere
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/projects"
              className={
                currentPage === "Projects" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
              }
            >
              Projects
            </Link>
            <Link
              href="/tasks"
              className={
                currentPage === "My Tasks" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
              }
            >
              My Tasks
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder={searchPlaceholder} className="pl-10 w-64" />
            </div>
          )}

          {actionButtons && actionButtons.map((button, index) => <div key={index}>{button}</div>)}

          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder.svg?height=32&width=32" />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}

export default Navigation
export { Navigation }
