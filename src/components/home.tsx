import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "./dashboard/DashboardHeader";
import ProjectList from "./dashboard/ProjectList";
import MainContent from "./dashboard/MainContent";
import { SettingsDialog } from "./dashboard/SettingsDialog";
import { getCurrentUser, logout } from "@/lib/auth";

interface HomeProps {
  userType?: "landscaper" | "client";
}

const Home: React.FC<HomeProps> = ({ userType = "landscaper" }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [activeTab, setActiveTab] = useState("ideaBoards");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const navigate = useNavigate();

  const user = getCurrentUser();
  if (!user) {
    navigate("/login");
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <DashboardHeader
        userName={user.username}
        userAvatar={
          user.avatar_url ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
        }
        userRole={user.role === "admin" ? "Admin" : "User"}
        projectId={selectedProjectId}
        onSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        <ProjectList
          selectedProjectId={selectedProjectId}
          onProjectSelect={setSelectedProjectId}
          userType={userType}
        />

        <MainContent
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedProjectId={selectedProjectId}
        />
      </div>

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        userId={user.id}
      />
    </div>
  );
};

export default Home;
