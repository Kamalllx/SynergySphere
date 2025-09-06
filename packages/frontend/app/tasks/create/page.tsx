"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, X, Plus } from "lucide-react"
import Navigation from "@/components/navigation"

export default function CreateTask() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get("project")

  const [formData, setFormData] = useState({
    name: "",
    assignee: "",
    project: projectId || "",
    tags: [] as string[],
    deadline: "",
    image: null as File | null,
    description: "",
  })
  const [newTag, setNewTag] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Task data:", formData)
    if (projectId) {
      router.push(`/projects/${projectId}`)
    } else {
      router.push("/tasks")
    }
  }

  const handleDiscard = () => {
    if (projectId) {
      router.push(`/projects/${projectId}`)
    } else {
      router.push("/tasks")
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }))
    }
  }

  const getBreadcrumb = () => {
    if (projectId) {
      return "Projects > Project Name > New Task"
    }
    return "Projects > New Task"
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        currentPage="Projects"
        showSearch={true}
        actionButtons={[
          <Button key="discard" variant="outline" onClick={handleDiscard}>
            Discard
          </Button>,
          <Button key="save" onClick={handleSubmit}>
            Save
          </Button>,
        ]}
      />

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r min-h-screen p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 text-primary">
              <div className="w-2 h-2 bg-primary rounded-full" />
              Projects
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
              <div className="w-2 h-2 bg-muted-foreground rounded-full" />
              My Tasks
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="mb-6">
            <nav className="text-sm text-muted-foreground">{getBreadcrumb()}</nav>
          </div>

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Create New Task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter task name"
                    required
                  />
                </div>

                {/* Assignee */}
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select
                    value={formData.assignee}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, assignee: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="john-doe">John Doe</SelectItem>
                      <SelectItem value="jane-smith">Jane Smith</SelectItem>
                      <SelectItem value="mike-johnson">Mike Johnson</SelectItem>
                      <SelectItem value="sarah-wilson">Sarah Wilson</SelectItem>
                      <SelectItem value="alex-brown">Alex Brown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Project */}
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select
                    value={formData.project}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, project: value }))}
                    disabled={!!projectId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website-redesign">Website Redesign</SelectItem>
                      <SelectItem value="mobile-app">Mobile App Development</SelectItem>
                      <SelectItem value="marketing-campaign">Marketing Campaign</SelectItem>
                      <SelectItem value="data-migration">Data Migration</SelectItem>
                    </SelectContent>
                  </Select>
                  {projectId && (
                    <p className="text-xs text-muted-foreground">
                      Project must be selected when creating a task from project view
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag"
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Deadline */}
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Image</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {formData.image ? formData.image.name : "Upload Image"}
                      </p>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter task description"
                    rows={4}
                  />
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
