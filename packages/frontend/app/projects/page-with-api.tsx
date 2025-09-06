'use client';

import { useEffect } from 'react';
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Loader2 } from "lucide-react"
import Navigation from "@/components/navigation"
import { useProjects } from "@/hooks/use-api"
import { projectsApi as projectsService, type Project } from "@/lib/api-adapter-v2"

export default function ProjectsPage() {
  const { data: projects, loading, error, execute } = useProjects();

  useEffect(() => {
    execute(() => projectsService.getAll());
  }, [execute]);

  // Mock data fallback for now
  const mockProjects = [
    {
      id: "1",
      name: "Website Redesign",
      description: "Complete overhaul of company website with modern design",
      status: "active" as const,
      priority: "high" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      name: "Mobile App Development",
      description: "Native iOS and Android app for customer engagement",
      status: "active" as const,
      priority: "medium" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "3",
      name: "Marketing Campaign",
      description: "Q1 digital marketing strategy and implementation",
      status: "active" as const,
      priority: "low" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const displayProjects = projects || mockProjects;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'completed':
        return 'bg-blue-500';
      case 'on-hold':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="Projects" />
      
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-2">
              Manage and track your team projects
            </p>
          </div>
          
          <Link href="/projects/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-destructive">
              Failed to load projects: {error}
              <Button 
                variant="link" 
                className="ml-2 p-0 h-auto text-destructive underline"
                onClick={() => execute(() => projectsService.getAll())}
              >
                Retry
              </Button>
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2 text-muted-foreground">Loading projects...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`}
                          title={`Status: ${project.status}`}
                        />
                        <Badge variant={getPriorityColor(project.priority)}>
                          {project.priority}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {project.description || 'No description available'}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Status: {project.status}</span>
                      <span>
                        Updated: {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!loading && displayProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No projects found</p>
            <Link href="/projects/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Project
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
