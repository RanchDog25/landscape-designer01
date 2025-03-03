import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  onAddEvent: (event: {
    title: string;
    description: string;
    date: Date;
    type: "milestone" | "task" | "meeting";
    duration: "all-day" | "half-day";
  }) => void;
}

export function AddEventDialog({
  open,
  onOpenChange,
  initialDate = new Date(),
  onAddEvent,
}: AddEventDialogProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState<Date>(initialDate);
  const [type, setType] = React.useState<"milestone" | "task" | "meeting">(
    "task",
  );
  const [duration, setDuration] = React.useState<"all-day" | "half-day">(
    "all-day",
  );

  // Update date when initialDate changes and reset form when dialog closes
  React.useEffect(() => {
    if (open) {
      // Update the date when dialog opens with the initialDate
      setDate(initialDate);
    } else {
      // Reset form when dialog closes
      setTitle("");
      setDescription("");
      setType("task");
      setDuration("all-day");
    }
  }, [open, initialDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEvent({ title, description, date, type, duration });
    onOpenChange(false);
    setTitle("");
    setDescription("");
    setDate(new Date());
    setType("task");
    setDuration("all-day");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Event</DialogTitle>
          <DialogDescription>
            Create a new event in your project calendar.
          </DialogDescription>
        </DialogHeader>

        <form id="add-event-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[50px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="milestone">Milestone</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="flex items-center justify-between">
              <RadioGroup
                value={duration}
                onValueChange={(value: "all-day" | "half-day") =>
                  setDuration(value)
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all-day" id="all-day" />
                  <Label htmlFor="all-day">All Day</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="half-day" id="half-day" />
                  <Label htmlFor="half-day">Half Day</Label>
                </div>
              </RadioGroup>
              <Button type="submit" form="add-event-form">
                Add Event
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <div className="border rounded-md p-4 overflow-hidden">
              <Calendar
                mode="single"
                selected={date}
                month={date}
                onSelect={(date) => date && setDate(date)}
                className="w-full"
              />
            </div>
          </div>
        </form>

        {/* Button moved next to Half Day radio button */}
      </DialogContent>
    </Dialog>
  );
}
