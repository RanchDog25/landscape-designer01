import React, { useState, useEffect } from "react";
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
  project_name?: string;
}

interface ProjectCalendarProps {
  projectId?: string;
  isAllProjects?: boolean;
}

const ProjectCalendar: React.FC<ProjectCalendarProps> = ({
  projectId,
  isAllProjects = false,
}) => {
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [deleteEvent, setDeleteEvent] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // State for project selection when in All Projects view
  const [selectedProjectForEvent, setSelectedProjectForEvent] =
    useState<string>("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  // Load projects for the dropdown
  useEffect(() => {
    if (isAllProjects) {
      const loadProjects = async () => {
        const { data } = await supabase
          .from("projects")
          .select("id, name")
          .is("deleted_at", null)
          .order("name");

        setProjects(data || []);
        if (data?.length > 0) {
          setSelectedProjectForEvent(data[0].id);
        }
      };

      loadProjects();
    }
  }, [isAllProjects]);

  const loadEvents = async () => {
    let query = supabase
      .from("calendar_events")
      .select("*, projects(name)")
      .order("start_date", { ascending: true });

    // Only filter by project if not in "All Projects" view
    if (!isAllProjects && projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query;

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
        project_name: event.projects?.name,
      })),
    );
  };

  useEffect(() => {
    loadEvents();

    let channel;

    if (isAllProjects) {
      // Subscribe to all calendar events
      channel = supabase
        .channel(`calendar_events_all`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "calendar_events",
          },
          () => {
            loadEvents();
          },
        )
        .subscribe();
    } else if (projectId) {
      // Subscribe to project-specific events
      channel = supabase
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
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [projectId, isAllProjects]);

  const handleAddEvent = async (event: {
    title: string;
    description: string;
    date: Date;
    type: "milestone" | "task" | "meeting";
    duration: "all-day" | "half-day";
  }) => {
    // Determine which project ID to use
    const targetProjectId = isAllProjects ? selectedProjectForEvent : projectId;
    if (!targetProjectId) return;

    try {
      const { error } = await supabase.from("calendar_events").insert({
        project_id: targetProjectId,
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

  // Helper functions to filter events by time period
  const getDayEvents = (date: Date) => {
    return events.filter(
      (event) =>
        event.date.getDate() === date.getDate() &&
        event.date.getMonth() === date.getMonth() &&
        event.date.getFullYear() === date.getFullYear(),
    );
  };

  const getWeekEvents = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Sunday

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

    return events.filter((event) => {
      return event.date >= startOfWeek && event.date <= endOfWeek;
    });
  };

  const getMonthEvents = (date: Date) => {
    return events.filter(
      (event) =>
        event.date.getMonth() === date.getMonth() &&
        event.date.getFullYear() === date.getFullYear(),
    );
  };

  const getYearEvents = (date: Date) => {
    return events.filter(
      (event) => event.date.getFullYear() === date.getFullYear(),
    );
  };

  // Render event card
  const renderEventCard = (event: ProjectEvent) => (
    <Card key={event.id} className="p-4 mb-2">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium">{event.title}</h4>
          <p className="text-sm text-gray-500">{event.description}</p>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">{event.type}</Badge>
            <Badge variant="outline">{event.duration}</Badge>
            {isAllProjects && event.project_name && (
              <Badge variant="outline" className="bg-primary/10">
                {event.project_name}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {event.date.toLocaleDateString()}
          </p>
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
                onClick={() => handleStatusChange(event.id, "pending")}
              >
                Pending
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusChange(event.id, "in_progress")}
              >
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusChange(event.id, "completed")}
              >
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusChange(event.id, "cancelled")}
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
  );

  return (
    <div className="flex h-full bg-background p-6">
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Project Calendar</h2>
          {isAllProjects && (
            <select
              className="p-2 border rounded"
              value={selectedProjectForEvent}
              onChange={(e) => setSelectedProjectForEvent(e.target.value)}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Column 1: Date Picker and Add Event */}
          <Card className="p-4">
            <div className="mb-4">
              <Button
                onClick={() => {
                  // When opening the dialog, pass the selected date
                  setIsAddEventOpen(true);
                }}
                className="w-full mb-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </div>
          </Card>

          {/* Column 2: Day Events */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">
              Events for {selectedDate.toLocaleDateString()}
            </h3>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {getDayEvents(selectedDate).length > 0 ? (
                  getDayEvents(selectedDate).map(renderEventCard)
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    No events for this day
                  </p>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Column 3: Week Events */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Events this Week</h3>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {getWeekEvents(selectedDate).length > 0 ? (
                  getWeekEvents(selectedDate).map(renderEventCard)
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    No events for this week
                  </p>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Column 4: Month Events */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Events this Month</h3>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {getMonthEvents(selectedDate).length > 0 ? (
                  getMonthEvents(selectedDate).map(renderEventCard)
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    No events for this month
                  </p>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Year Events Section */}
        <Card className="p-4 mt-4">
          <h3 className="font-semibold mb-4">
            Events this Year ({selectedDate.getFullYear()})
          </h3>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {getYearEvents(selectedDate).length > 0 ? (
                getYearEvents(selectedDate).map(renderEventCard)
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No events for this year
                </p>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <AddEventDialog
        open={isAddEventOpen}
        onOpenChange={setIsAddEventOpen}
        initialDate={selectedDate}
        onAddEvent={(eventData) => {
          // The date is already set from the initialDate prop
          handleAddEvent(eventData);
        }}
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
