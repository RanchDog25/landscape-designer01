import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Plus,
  CheckCircle,
  XCircle,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { AddEventDialog } from "./AddEventDialog";
import { DeleteEventDialog } from "./DeleteEventDialog";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: "milestone" | "task" | "meeting";
  duration: "all-day" | "half-day";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  created_by?: string;
  project_id?: string;
}

interface ProjectCalendarProps {
  projectId?: string;
}

type ViewMode = "day" | "week" | "month" | "year";

const ProjectCalendar: React.FC<ProjectCalendarProps> = ({ projectId }) => {
  const [events, setEvents] = React.useState<ProjectEvent[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [isAddEventOpen, setIsAddEventOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>("month");
  const [deleteEvent, setDeleteEvent] = React.useState<{
    id: string;
    title: string;
  } | null>(null);

  const loadEvents = async () => {
    if (!projectId) {
      setEvents([]);
      return;
    }

    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("project_id", projectId)
      .order("start_date", { ascending: true });

    if (error) {
      console.error("Error loading events:", error);
      return;
    }

    setEvents(
      data.map((event) => ({
        ...event,
        id: event.id,
        title: event.title,
        description: event.description,
        date: new Date(event.start_date),
        type: event.type,
        duration: event.duration,
        status: event.status || "pending",
        created_by: event.created_by,
        project_id: event.project_id,
      })),
    );
  };

  React.useEffect(() => {
    loadEvents();

    if (!projectId) return;

    const channel = supabase
      .channel(`calendar_events_${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "calendar_events",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadEvents();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const handleAddEvent = async (event: {
    title: string;
    description: string;
    date: Date;
    type: "milestone" | "task" | "meeting";
    duration: "all-day" | "half-day";
  }) => {
    if (!projectId) return;

    try {
      const { error } = await supabase.from("calendar_events").insert({
        project_id: projectId,
        title: event.title,
        description: event.description,
        start_date: event.date.toISOString(),
        type: event.type,
        duration: event.duration,
        status: "pending",
      });

      if (error) throw error;
      loadEvents();
    } catch (error) {
      console.error("Error adding event:", error);
    }
  };

  const handleStatusChange = async (eventId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("calendar_events")
        .update({ status })
        .eq("id", eventId);

      if (error) throw error;
      loadEvents();
    } catch (error) {
      console.error("Error updating event status:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "in_progress":
        return <PlayCircle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getEventsByDate = (date: Date) => {
    return events.filter(
      (event) =>
        event.date.getDate() === date.getDate() &&
        event.date.getMonth() === date.getMonth() &&
        event.date.getFullYear() === date.getFullYear(),
    );
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <p className="text-muted-foreground">
          Select a project to view calendar
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Project Calendar</h2>
          <Button onClick={() => setIsAddEventOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6">
          <Card className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4">
              Events for {selectedDate.toLocaleDateString()}
            </h3>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {getEventsByDate(selectedDate).map((event) => (
                  <Card key={event.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-gray-500">
                          {event.description}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{event.type}</Badge>
                          <Badge variant="outline">{event.duration}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              {getStatusIcon(event.status) || (
                                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(event.id, "pending")
                              }
                            >
                              Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(event.id, "in_progress")
                              }
                            >
                              In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(event.id, "completed")
                              }
                            >
                              Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(event.id, "cancelled")
                              }
                            >
                              Cancelled
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDeleteEvent({
                              id: event.id,
                              title: event.title,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>

      <AddEventDialog
        open={isAddEventOpen}
        onOpenChange={setIsAddEventOpen}
        onAddEvent={handleAddEvent}
      />

      {deleteEvent && (
        <DeleteEventDialog
          open={!!deleteEvent}
          onOpenChange={() => setDeleteEvent(null)}
          eventId={deleteEvent.id}
          eventTitle={deleteEvent.title}
          onSuccess={loadEvents}
        />
      )}
    </div>
  );
};

export default ProjectCalendar;
