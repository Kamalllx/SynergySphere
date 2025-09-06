import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Plus, Settings, Bell, User, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function TasksPage() {
  const tasks = [
    {
      id: 1,
      title: "Design Homepage Mockup",
      description: "Create wireframes and high-fidelity mockups for the new homepage design",
      project: "Website Redesign",
      priority: "High",
      status: "In Progress",
      assignee: {
        name: "Alice Johnson",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      dueDate: "Nov 25, 2024",
      progress: 75,
    },
    {
      id: 2,
      title: "API Integration Testing",
      description: "Test all API endpoints and ensure proper error handling",
      project: "Mobile App Development",
      priority: "Medium",
      status: "Todo",
      assignee: {
        name: "Bob Smith",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      dueDate: "Nov 30, 2024",
      progress: 0,
    },
    {
      id: 3,
      title: "Content Strategy Review",
      description: "Review and approve Q1 content calendar and messaging strategy",
      project: "Marketing Campaign",
      priority: "Low",
      status: "Review",
      assignee: {
        name: "Carol Davis",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      dueDate: "Nov 22, 2024",
      progress: 100,
    },
    {
      id: 4,
      title: "Database Schema Design",
      description: "Design and document the database schema for user management",
      project: "Mobile App Development",
      priority: "High",
      status: "In Progress",
      assignee: {
        name: "David Wilson",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      dueDate: "Nov 28, 2024",
      progress: 45,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-primary">
              SynergySphere
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/projects" className="text-muted-foreground hover:text-foreground">
                Projects
              </Link>
              <Link href="/tasks" className="text-primary font-medium">
                My Tasks
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Search tasks..." className="pl-10 w-64" />
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
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

      {/* Main Content */}
      <main className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Tasks</h1>
          <p className="text-muted-foreground">Track and manage your assigned tasks</p>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold text-balance mb-1">{task.title}</CardTitle>
                    <p className="text-sm text-muted-foreground text-pretty">{task.description}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Badge
                      variant={
                        task.status === "In Progress" ? "default" : task.status === "Todo" ? "secondary" : "outline"
                      }
                    >
                      {task.status}
                    </Badge>
                    <Badge
                      variant={
                        task.priority === "High" ? "destructive" : task.priority === "Medium" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Project Info */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Project:</span>
                  <Link href="/projects/1" className="text-primary hover:underline font-medium">
                    {task.project}
                  </Link>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{task.progress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>

                {/* Assignee and Due Date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={task.assignee.avatar || "/placeholder.svg"} alt={task.assignee.name} />
                      <AvatarFallback className="text-xs">
                        {task.assignee.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{task.assignee.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{task.dueDate}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
