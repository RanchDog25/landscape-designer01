import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { LogOut, Settings, MessageCircle } from "lucide-react";
import ChatButton from "./ChatButton";
import ActivityFeed from "./ActivityFeed";
import { getCurrentUser } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  userAvatar?: string;
  userName?: string;
  userRole?: string;
  projectId?: string;
  onLogout?: () => void;
  onSettings?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
  userName = "John Doe",
  userRole = "User",
  projectId,
  onLogout = () => {},
  onSettings = () => {},
}) => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  return (
    <header className="w-full h-[72px] px-6 border-b bg-white flex items-center justify-between">
      <div className="flex items-center gap-4">
        <img
          src="/evergold-logo.svg"
          alt="Evergold Landscaping"
          className="h-12 mr-4"
        />
        <ActivityFeed projectId={projectId} />
        {user?.role === "admin" && (
          <Button variant="outline" onClick={() => navigate("/admin")}>
            Admin Dashboard
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <ChatButton projectId={projectId} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userRole}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSettings}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default DashboardHeader;
