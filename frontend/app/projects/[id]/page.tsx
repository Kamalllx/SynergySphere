import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Plus, Settings, Bell, User, ArrowLeft, MoreHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function ProjectTasksPage({ params }: { params: { id: string } }) {
  const project = {
    id: params.id,
    title: "Website Redesign",
    description: "Complete overhaul of company website with modern design",
    status: "In Progress",
    progress: 65,
  }

  const tasks = [
    {
      id: 1,
      title: "Design Homepage Mockup",
      description: "Create wireframes and high-fidelity mockups for the new homepage design",
      priority: "High",
      status: "In Progress",
      assignees: [
        { name: "Alice Johnson", avatar: "/placeholder.svg?height=32&width=32" },
        { name: "Bob Smith", avatar: "/placeholder.svg?height=32&width=32" },
      ],
      dueDate: "Nov 25, 2024",
      progress: 75,
    },
    {
      id: 2,
      title: "Content Migration",
      description: "Migrate existing content to new CMS structure",
      priority: "Medium",
      status: "Todo",
      assignees: [{ name: "Carol Davis", avatar: "/placeholder.svg?height=32&width=32" }],
      dueDate: "Nov 30, 2024",
      progress: 0,
    },
    {
      id: 3,
      title: "SEO Optimization",
      description: "Implement SEO best practices and meta tags",
      priority: "Low",
      status: "Review",
      assignees: [
        { name: "David Wilson", avatar: "/placeholder.svg?height=32&width=32" },
        { name: "Eva Brown", avatar: "/placeholder.svg?height=32&width=32" },
        { name: "Frank Miller", avatar: "/placeholder.svg?height=32&width=32" },
      ],
      dueDate: "Dec 5, 2024",
      progress: 90,
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
              <Link href="/projects" className="text-primary font-medium">
                Projects
              </Link>
              <Link href="/tasks" className="text-muted-foreground hover:text-foreground">
                My Tasks
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Search tasks in project..." className="pl-10 w-64" />
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <Link href={`/tasks/create?project=${params.id}`} className="text-foreground">
                Add Task
              </Link>
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
        {/* Project Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Projects
              </Button>
            </Link>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{project.title}</h1>
              <p className="text-muted-foreground mb-4">{project.description}</p>

              {/* Project Progress */}
              <div className="flex items-center gap-4">
                <Badge variant="default">{project.status}</Badge>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Progress:</span>
                  <div className="w-32 bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{project.progress}%</span>
                </div>
              </div>
            </div>

            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-4">Tasks inside Project</h2>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold text-balance">{task.title}</CardTitle>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Badge
                      variant={
                        task.status === "In Progress" ? "default" : task.status === "Todo" ? "secondary" : "outline"
                      }
                      className="text-xs"
                    >
                      {task.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-pretty">{task.description}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Priority */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Priority</span>
                  <Badge
                    variant={
                      task.priority === "High" ? "destructive" : task.priority === "Medium" ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {task.priority}
                  </Badge>
                </div>

                {/* Progress */}
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

                {/* Assignees */}
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Assigned to</span>
                  <div className="flex -space-x-2">
                    {task.assignees.slice(0, 3).map((assignee, index) => (
                      <Avatar key={index} className="h-6 w-6 border-2 border-background">
                        <AvatarImage src={assignee.avatar || "/placeholder.svg"} alt={assignee.name} />
                        <AvatarFallback className="text-xs">
                          {assignee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {task.assignees.length > 3 && (
                      <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <span className="text-xs font-medium text-muted-foreground">+{task.assignees.length - 3}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Due Date</span>
                  <span className="font-medium">{task.dueDate}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
