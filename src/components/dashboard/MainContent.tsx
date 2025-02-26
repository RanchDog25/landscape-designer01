import React from "react";
import NavigationTabs from "./NavigationTabs";
import IdeaBoards from "./IdeaBoards";
import ChatInterface from "./ChatInterface";
import ProjectCalendar from "./ProjectCalendar";
import ProjectMap from "./ProjectMap";

interface MainContentProps {
  activeTab?: string;
  onTabChange?: (value: string) => void;
  selectedProjectId?: string;
}

const MainContent: React.FC<MainContentProps> = ({
  activeTab = "ideaBoards",
  onTabChange = () => {},
  selectedProjectId,
}) => {
  if (!selectedProjectId) return null;

  return (
    <div className="flex flex-col w-full h-full bg-gray-50">
      <NavigationTabs activeTab={activeTab} onTabChange={onTabChange} />
      <div className="flex-1 overflow-hidden">
        {activeTab === "ideaBoards" && <IdeaBoards />}
        {activeTab === "chat" && (
          <ChatInterface projectId={selectedProjectId} />
        )}
        {activeTab === "calendar" && <ProjectCalendar />}
        {activeTab === "map" && <ProjectMap projectId={selectedProjectId} />}
      </div>
    </div>
  );
};

export default MainContent;
