import React, { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { AddProjectDialog } from "./AddProjectDialog";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

interface Project {
  id: string;
  name: string;
  status: "active" | "pending" | "completed";
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

interface ProjectListProps {
  selectedProjectId?: string;
  onProjectSelect?: (projectId: string) => void;
  userType?: "landscaper" | "client";
}

const ProjectList: React.FC<ProjectListProps> = ({
  selectedProjectId,
  onProjectSelect = () => {},
  userType = "landscaper",
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [deleteProject, setDeleteProject] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const currentUser = getCurrentUser();

  const loadProjects = async () => {
    if (!currentUser) return;

    let query = supabase
      .from("projects")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // If not admin, only show assigned projects
    if (currentUser.role !== "admin") {
      const { data: userProjects } = await supabase
        .from("user_projects")
        .select("project_id")
        .eq("user_id", currentUser.id);

      const projectIds = userProjects?.map((up) => up.project_id) || [];
      if (projectIds.length > 0) {
        query = query.in("id", projectIds);
      } else {
        setProjects([]);
        return;
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading projects:", error);
      return;
    }

    setProjects(data || []);
  };

  useEffect(() => {
    loadProjects();

    const channel = supabase
      .channel("projects")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => {
          loadProjects();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "completed":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const canAddProjects = currentUser?.role === "admin";

  return (
    <div className="w-[280px] h-full bg-white border-r flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Projects</h2>
          {canAddProjects && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddProjectOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          )}
        </div>
        <div className="relative">
          <FolderOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 border rounded-md text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors group ${
                project.id === selectedProjectId ? "border-primary" : ""
              }`}
              onClick={() => onProjectSelect(project.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${project.name}`}
                      alt={project.name}
                      className="rounded-full"
                    />
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">
                      {project.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {canAddProjects && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteProject({ id: project.id, name: project.name });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Badge className={getStatusColor(project.status || "active")}>
                  {project.status || "active"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <AddProjectDialog
        open={isAddProjectOpen}
        onOpenChange={setIsAddProjectOpen}
        onSuccess={loadProjects}
      />

      {deleteProject && (
        <DeleteProjectDialog
          open={!!deleteProject}
          onOpenChange={() => setDeleteProject(null)}
          projectId={deleteProject.id}
          projectName={deleteProject.name}
          onSuccess={loadProjects}
        />
      )}
    </div>
  );
};

export default ProjectList;
