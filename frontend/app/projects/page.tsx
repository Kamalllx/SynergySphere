import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Plus, Settings, Bell, User } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function ProjectsPage() {
  const projects = [
    {
      id: 1,
      title: "Website Redesign",
      description: "Complete overhaul of company website with modern design",
      status: "In Progress",
      members: [
        { name: "Alice Johnson", avatar: "/placeholder.svg?height=32&width=32" },
        { name: "Bob Smith", avatar: "/placeholder.svg?height=32&width=32" },
        { name: "Carol Davis", avatar: "/placeholder.svg?height=32&width=32" },
      ],
      progress: 65,
      dueDate: "Dec 15, 2024",
    },
    {
      id: 2,
      title: "Mobile App Development",
      description: "Native iOS and Android app for customer engagement",
      status: "Planning",
      members: [
        { name: "David Wilson", avatar: "/placeholder.svg?height=32&width=32" },
        { name: "Eva Brown", avatar: "/placeholder.svg?height=32&width=32" },
      ],
      progress: 25,
      dueDate: "Jan 30, 2025",
    },
    {
      id: 3,
      title: "Marketing Campaign",
      description: "Q1 digital marketing strategy and implementation",
      status: "Review",
      members: [
        { name: "Frank Miller", avatar: "/placeholder.svg?height=32&width=32" },
        { name: "Grace Lee", avatar: "/placeholder.svg?height=32&width=32" },
        { name: "Henry Taylor", avatar: "/placeholder.svg?height=32&width=32" },
        { name: "Ivy Chen", avatar: "/placeholder.svg?height=32&width=32" },
      ],
      progress: 90,
      dueDate: "Nov 28, 2024",
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
              <Input placeholder="Search projects..." className="pl-10 w-64" />
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <Link href="/projects/create">New Project</Link>
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Projects</h1>
          <p className="text-muted-foreground">Manage and track your team's projects</p>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-balance">{project.title}</CardTitle>
                    <Badge
                      variant={
                        project.status === "In Progress"
                          ? "default"
                          : project.status === "Planning"
                            ? "secondary"
                            : "outline"
                      }
                      className="ml-2 shrink-0"
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground text-pretty">{project.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Team</span>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {project.members.slice(0, 3).map((member, index) => (
                          <Avatar key={index} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                            <AvatarFallback className="text-xs">
                              {member.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {project.members.length > 3 && (
                          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                            <span className="text-xs font-medium text-muted-foreground">
                              +{project.members.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Due Date</span>
                    <span className="font-medium">{project.dueDate}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Empty State for Additional Projects */}
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Create New Project</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-sm">
              Start collaborating with your team by creating a new project
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              <Link href="/projects/create">New Project</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
