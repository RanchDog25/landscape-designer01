import React from "react";
import NavigationTabs from "./NavigationTabs";
import IdeaBoards from "./IdeaBoards";
import ChatInterface from "./ChatInterface";
import ProjectCalendar from "./ProjectCalendar";
import ProjectMap from "./ProjectMap";
import DocumentManager from "./DocumentManager";
import { ALL_PROJECTS_ID } from "./ProjectList";
import { Info } from "lucide-react";

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
  if (!selectedProjectId) {
    return (
      <div className="flex flex-col w-full h-full bg-gray-50">
        <NavigationTabs activeTab={activeTab} onTabChange={onTabChange} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">
            Select a project to get started
          </p>
        </div>
      </div>
    );
  }

  const isAllProjects = selectedProjectId === ALL_PROJECTS_ID;

  return (
    <div className="flex flex-col w-full h-full bg-gray-50">
      <NavigationTabs activeTab={activeTab} onTabChange={onTabChange} />

      {isAllProjects && (
        <div className="bg-primary/10 px-4 py-2 mx-4 mt-4 rounded-md flex items-center">
          <Info className="h-4 w-4 mr-2 text-primary" />
          <p className="text-sm">Viewing data across all projects</p>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {activeTab === "ideaBoards" && (
          <IdeaBoards
            projectId={isAllProjects ? undefined : selectedProjectId}
            isAllProjects={isAllProjects}
            key={`ideaboards-${selectedProjectId}`}
          />
        )}
        {activeTab === "chat" && (
          <ChatInterface
            projectId={isAllProjects ? undefined : selectedProjectId}
            isAllProjects={isAllProjects}
          />
        )}
        {activeTab === "calendar" && (
          <ProjectCalendar
            projectId={isAllProjects ? undefined : selectedProjectId}
            isAllProjects={isAllProjects}
          />
        )}
        {activeTab === "map" && (
          <ProjectMap
            projectId={isAllProjects ? undefined : selectedProjectId}
            isAllProjects={isAllProjects}
            key={`map-${selectedProjectId}`}
          />
        )}
        {activeTab === "documents" && (
          <DocumentManager
            projectId={isAllProjects ? undefined : selectedProjectId}
            isAllProjects={isAllProjects}
          />
        )}
      </div>
    </div>
  );
};

export default MainContent;
