import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "./dashboard/DashboardHeader";
import ProjectList from "./dashboard/ProjectList";
import MainContent from "./dashboard/MainContent";
import { SettingsDialog } from "./dashboard/SettingsDialog";
import { signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./auth/AuthProvider";

interface HomeProps {
  userType?: "landscaper" | "client";
}

const Home: React.FC<HomeProps> = ({ userType = "landscaper" }) => {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [activeTab, setActiveTab] = useState("ideaBoards");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [profile, setProfile] = useState<{
    full_name?: string;
    avatar_url?: string;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(data);
    };

    loadProfile();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <DashboardHeader
        userName={profile?.full_name || user?.email?.split("@")[0] || "User"}
        userAvatar={
          profile?.avatar_url ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`
        }
        userRole={userType === "landscaper" ? "Landscaper" : "Client"}
        onLogout={handleLogout}
        onSettings={() => setIsSettingsOpen(true)}
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

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
};

export default Home;
