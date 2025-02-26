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
import { useAuth } from "../auth/AuthProvider";
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
  const { user } = useAuth();
  const [events, setEvents] = React.useState<ProjectEvent[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [isAddEventOpen, setIsAddEventOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>("month");
  const [deleteEvent, setDeleteEvent] = React.useState<{
    id: string;
    title: string;
  } | null>(null);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
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

    const channel = supabase
      .channel("calendar_events")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events" },
        () => {
          loadEvents();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddEvent = async (eventData: {
    title: string;
    description: string;
    date: Date;
    type: "milestone" | "task" | "meeting";
    duration: "all-day" | "half-day";
  }) => {
    const { error } = await supabase.from("calendar_events").insert({
      title: eventData.title,
      description: eventData.description,
      start_date: eventData.date.toISOString(),
      type: eventData.type,
      duration: eventData.duration,
      status: "pending",
      created_by: user?.id,
      project_id: projectId,
    });

    if (error) {
      console.error("Error adding event:", error);
      return;
    }
  };

  const handleStatusChange = async (
    eventId: string,
    status: ProjectEvent["status"],
  ) => {
    try {
      const { error } = await supabase
        .from("calendar_events")
        .update({ status })
        .eq("id", eventId);

      if (error) throw error;
      await loadEvents();
    } catch (error) {
      console.error("Error updating event status:", error);
    }
  };

  const getVisibleEvents = () => {
    return events.filter((event) => {
      const eventDate = event.date;
      switch (viewMode) {
        case "day":
          return eventDate.toDateString() === selectedDate.toDateString();
        case "week":
          const weekStart = new Date(selectedDate);
          weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return eventDate >= weekStart && eventDate <= weekEnd;
        case "month":
          return (
            eventDate.getMonth() === selectedDate.getMonth() &&
            eventDate.getFullYear() === selectedDate.getFullYear()
          );
        case "year":
          return eventDate.getFullYear() === selectedDate.getFullYear();
        default:
          return true;
      }
    });
  };

  const getBadgeColor = (
    type: ProjectEvent["type"],
    status: ProjectEvent["status"],
  ) => {
    if (status === "completed") return "bg-green-500";
    if (status === "cancelled") return "bg-red-500";
    if (status === "in_progress") return "bg-yellow-500";

    switch (type) {
      case "milestone":
        return "bg-blue-500";
      case "task":
        return "bg-purple-500";
      case "meeting":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="h-full w-full bg-white p-6">
      <div className="flex h-full gap-6">
        <Card className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Project Timeline</h2>
            <div className="flex gap-2">
              <Select
                value={viewMode}
                onValueChange={(value: ViewMode) => setViewMode(value)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddEventOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                setSelectedDate(date);
                setViewMode("month");
              }
            }}
            onMonthChange={(date) => {
              setSelectedDate(date);
              setViewMode("month");
            }}
            className="rounded-md border"
          />
        </Card>

        <Card className="w-[300px] p-6">
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays className="h-5 w-5" />
            <h3 className="text-lg font-medium">
              {selectedDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h3>
          </div>

          <ScrollArea className="h-[calc(100%-4rem)]">
            <div className="space-y-4">
              {getVisibleEvents().length > 0 ? (
                getVisibleEvents().map((event) => (
                  <div
                    key={event.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        className={getBadgeColor(event.type, event.status)}
                      >
                        {event.type}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{event.duration}</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {event.status === "completed" && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                              {event.status === "in_progress" && (
                                <PlayCircle className="h-4 w-4 text-yellow-500" />
                              )}
                              {event.status === "cancelled" && (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              {event.status === "pending" && (
                                <PlayCircle className="h-4 w-4 text-gray-500" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(event.id, "pending")
                              }
                            >
                              Set as Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(event.id, "in_progress")
                              }
                            >
                              Start Task
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(event.id, "completed")
                              }
                            >
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(event.id, "cancelled")
                              }
                            >
                              Cancel Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() =>
                            setDeleteEvent({ id: event.id, title: event.title })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <h4 className="font-medium">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {event.description}
                      </p>
                    )}
                    <span className="text-xs text-gray-500 block mt-2">
                      {event.date.toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center">
                  No events scheduled for this {viewMode}
                </p>
              )}
            </div>
          </ScrollArea>
        </Card>
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
