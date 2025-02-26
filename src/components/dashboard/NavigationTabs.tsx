import React from "react";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { ImageIcon, MessageCircleIcon, CalendarIcon, Map } from "lucide-react";

interface NavigationTabsProps {
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

const NavigationTabs = ({
  activeTab = "ideaBoards",
  onTabChange = () => {},
}: NavigationTabsProps) => {
  return (
    <div className="w-full bg-white border-b border-gray-200">
      <Tabs
        defaultValue={activeTab}
        className="w-full"
        onValueChange={onTabChange}
      >
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="ideaBoards" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Idea Boards</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircleIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Map</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default NavigationTabs;
