import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  MessageSquare,
  Upload,
  FileText,
  Calendar,
  Map,
  Clock,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Activity {
  id: string;
  type: "message" | "upload" | "document" | "event" | "map_area";
  content: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
  project_name?: string;
  project_id?: string;
}

interface ActivityFeedProps {
  projectId?: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ projectId }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const pageSize = 20;

  const loadActivities = async (reset = false) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const newPage = reset ? 0 : page;

      // Fetch messages
      const messagesQuery = supabase
        .from("messages")
        .select(
          "id, content, user_name, user_avatar, created_at, project_id, projects(name)",
        )
        .order("created_at", { ascending: false })
        .range(newPage * pageSize, (newPage + 1) * pageSize - 1);

      // If projectId is provided, filter by project
      if (projectId) {
        messagesQuery.eq("project_id", projectId);
      }

      const { data: messagesData, error: messagesError } = await messagesQuery;

      if (messagesError) throw messagesError;

      // Fetch media uploads
      const mediaQuery = supabase
        .from("media")
        .select(
          "id, title, description, created_at, project_id, projects(name)",
        )
        .order("created_at", { ascending: false })
        .range(newPage * pageSize, (newPage + 1) * pageSize - 1);

      if (projectId) {
        mediaQuery.eq("project_id", projectId);
      }

      const { data: mediaData, error: mediaError } = await mediaQuery;

      if (mediaError) throw mediaError;

      // Fetch documents
      const documentsQuery = supabase
        .from("documents")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .range(newPage * pageSize, (newPage + 1) * pageSize - 1);

      const { data: documentsData, error: documentsError } =
        await documentsQuery;

      if (documentsError) throw documentsError;

      // Fetch calendar events
      const eventsQuery = supabase
        .from("calendar_events")
        .select("id, title, created_at, project_id, projects(name)")
        .order("created_at", { ascending: false })
        .range(newPage * pageSize, (newPage + 1) * pageSize - 1);

      if (projectId) {
        eventsQuery.eq("project_id", projectId);
      }

      const { data: eventsData, error: eventsError } = await eventsQuery;

      if (eventsError) throw eventsError;

      // Fetch map areas
      const areasQuery = supabase
        .from("project_areas")
        .select(
          "id, name, created_at, map_id, project_maps(project_id, projects(name))",
        )
        .order("created_at", { ascending: false })
        .range(newPage * pageSize, (newPage + 1) * pageSize - 1);

      if (projectId) {
        areasQuery.eq("project_maps.project_id", projectId);
      }

      const { data: areasData, error: areasError } = await areasQuery;

      if (areasError) throw areasError;

      // Transform messages to activities
      const messageActivities: Activity[] = (messagesData || []).map(
        (message) => ({
          id: `message-${message.id}`,
          type: "message",
          content: message.content,
          user_name: message.user_name,
          user_avatar: message.user_avatar,
          created_at: message.created_at,
          project_name: message.projects?.name,
          project_id: message.project_id,
        }),
      );

      // Transform media to activities
      const mediaActivities: Activity[] = (mediaData || []).map((media) => ({
        id: `media-${media.id}`,
        type: "upload",
        content: media.title,
        user_name: "User", // Media doesn't track who uploaded it
        created_at: media.created_at,
        project_name: media.projects?.name,
        project_id: media.project_id,
      }));

      // Transform documents to activities
      const documentActivities: Activity[] = (documentsData || []).map(
        (doc) => ({
          id: `document-${doc.id}`,
          type: "document",
          content: doc.name,
          user_name: "User", // Documents don't track who uploaded them
          created_at: doc.created_at,
          project_name: "", // Documents aren't associated with projects
        }),
      );

      // Transform events to activities
      const eventActivities: Activity[] = (eventsData || []).map((event) => ({
        id: `event-${event.id}`,
        type: "event",
        content: event.title,
        user_name: "User", // Events don't track who created them
        created_at: event.created_at,
        project_name: event.projects?.name,
        project_id: event.project_id,
      }));

      // Transform map areas to activities
      const areaActivities: Activity[] = (areasData || []).map((area) => ({
        id: `area-${area.id}`,
        type: "map_area",
        content: area.name,
        user_name: "User", // Areas don't track who created them
        created_at: area.created_at,
        project_name: area.project_maps?.projects?.name,
        project_id: area.project_maps?.project_id,
      }));

      // Combine all activities
      const allActivities = [
        ...messageActivities,
        ...mediaActivities,
        ...documentActivities,
        ...eventActivities,
        ...areaActivities,
      ];

      // Sort by created_at
      allActivities.sort((a, b) => {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      // Take only the first pageSize items
      const paginatedActivities = allActivities.slice(0, pageSize);

      if (reset) {
        setActivities(paginatedActivities);
      } else {
        setActivities([...activities, ...paginatedActivities]);
      }

      setHasMore(paginatedActivities.length === pageSize);
      setPage(reset ? 1 : newPage + 1);
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadActivities(true);
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (!isOpen) return;

    // Set up subscriptions for real-time updates
    const messagesChannel = supabase
      .channel("activity-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => loadActivities(true),
      )
      .subscribe();

    const mediaChannel = supabase
      .channel("activity-media")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "media" },
        () => loadActivities(true),
      )
      .subscribe();

    const documentsChannel = supabase
      .channel("activity-documents")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "documents" },
        () => loadActivities(true),
      )
      .subscribe();

    const eventsChannel = supabase
      .channel("activity-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calendar_events" },
        () => loadActivities(true),
      )
      .subscribe();

    const areasChannel = supabase
      .channel("activity-areas")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "project_areas" },
        () => loadActivities(true),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(mediaChannel);
      supabase.removeChannel(documentsChannel);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(areasChannel);
    };
  }, [isOpen]);

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "upload":
        return <Upload className="h-4 w-4 text-green-500" />;
      case "document":
        return <FileText className="h-4 w-4 text-orange-500" />;
      case "event":
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case "map_area":
        return <Map className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case "message":
        return `sent a message: "${activity.content.length > 30 ? activity.content.substring(0, 30) + "..." : activity.content}"`;
      case "upload":
        return `uploaded media: ${activity.content}`;
      case "document":
        return `uploaded document: ${activity.content}`;
      case "event":
        return `added calendar event: ${activity.content}`;
      case "map_area":
        return `created map area: ${activity.content}`;
      default:
        return "performed an action";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return "just now";
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Clock className="h-5 w-5" />
          <span className="sr-only">Activity Feed</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[400px] sm:w-[540px] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-4 border-b flex flex-row justify-between items-center">
            <SheetTitle>Activity Feed</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadActivities(true)}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading activities..." : "No activities found"}
                </div>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={
                          activity.user_avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.user_name}`
                        }
                        alt={activity.user_name}
                      />
                      <AvatarFallback>
                        {activity.user_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {activity.user_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(activity.created_at)}
                        </span>
                      </div>

                      <p className="text-sm mt-1 flex items-center gap-1">
                        {getActivityIcon(activity.type)}
                        <span>{getActivityText(activity)}</span>
                      </p>

                      {activity.project_name && (
                        <Badge variant="outline" className="mt-2">
                          {activity.project_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}

              {hasMore && (
                <div className="py-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => loadActivities()}
                    disabled={isLoading}
                  >
                    {isLoading ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ActivityFeed;
