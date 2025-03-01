import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

interface User {
  id: string;
  username: string;
  role: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role: "user",
  });
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  // Check if current user is admin
  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== "admin") {
      navigate("/");
    }
  }, [navigate]);

  // Load users and projects
  useEffect(() => {
    loadUsers();
    loadProjects();
  }, []);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setUsers(data);
  };

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("name");
    if (!error && data) setProjects(data);
  };

  const loadUserProjects = async (userId: string) => {
    const { data } = await supabase
      .from("user_projects")
      .select("project_id")
      .eq("user_id", userId);
    setSelectedProjects((data || []).map((up) => up.project_id));
  };

  const handleAddUser = async () => {
    const { data, error } = await supabase
      .from("users")
      .insert({
        username: newUser.username,
        password: newUser.password,
        role: newUser.role,
      })
      .select()
      .single();

    if (error) {
      alert("Error creating user");
      return;
    }

    // Add user-project relationships
    if (selectedProjects.length > 0) {
      const { error: projectError } = await supabase
        .from("user_projects")
        .insert(
          selectedProjects.map((projectId) => ({
            user_id: data.id,
            project_id: projectId,
          })),
        );

      if (projectError) {
        alert("Error assigning projects");
      }
    }

    setIsAddUserOpen(false);
    setNewUser({ username: "", password: "", role: "user" });
    setSelectedProjects([]);
    loadUsers();
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    // Update user projects
    await supabase
      .from("user_projects")
      .delete()
      .eq("user_id", selectedUser.id);

    if (selectedProjects.length > 0) {
      await supabase.from("user_projects").insert(
        selectedProjects.map((projectId) => ({
          user_id: selectedUser.id,
          project_id: projectId,
        })),
      );
    }

    setIsEditUserOpen(false);
    setSelectedUser(null);
    setSelectedProjects([]);
    loadUsers();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">User Management</h1>
          <Button onClick={() => setIsAddUserOpen(true)}>Add User</Button>
        </div>

        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setSelectedUser(user);
                        await loadUserProjects(user.id);
                        setIsEditUserOpen(true);
                      }}
                    >
                      Edit Access
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Add User Dialog */}
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Project Access</Label>
                <div className="border rounded p-4 space-y-2 max-h-40 overflow-y-auto">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={project.id}
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProjects([
                              ...selectedProjects,
                              project.id,
                            ]);
                          } else {
                            setSelectedProjects(
                              selectedProjects.filter(
                                (id) => id !== project.id,
                              ),
                            );
                          }
                        }}
                      />
                      <label htmlFor={project.id}>{project.name}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddUser}>Add User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Edit Access for {selectedUser?.username}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Project Access</Label>
                <div className="border rounded p-4 space-y-2 max-h-40 overflow-y-auto">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`edit-${project.id}`}
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProjects([
                              ...selectedProjects,
                              project.id,
                            ]);
                          } else {
                            setSelectedProjects(
                              selectedProjects.filter(
                                (id) => id !== project.id,
                              ),
                            );
                          }
                        }}
                      />
                      <label htmlFor={`edit-${project.id}`}>
                        {project.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleEditUser}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}
