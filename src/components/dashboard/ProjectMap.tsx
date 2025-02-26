import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, X, Maximize2, Minimize2, Map } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadFile } from "@/lib/uploadFile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Area {
  id: string;
  name: string;
  description: string;
  coordinates: { points: [number, number][] };
  color: string;
}

interface ProjectMap {
  id: string;
  name: string;
  image_url: string;
}

interface ProjectMapProps {
  projectId?: string;
}

const ProjectMapComponent: React.FC<ProjectMapProps> = ({ projectId }) => {
  const [maps, setMaps] = useState<ProjectMap[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>();
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [isAddingMap, setIsAddingMap] = useState(false);
  const [newMapName, setNewMapName] = useState("");
  const [newArea, setNewArea] = useState({
    name: "",
    description: "",
    color: "#" + Math.floor(Math.random() * 16777215).toString(16),
  });
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!projectId) return null;

  const loadMaps = async () => {
    const { data, error } = await supabase
      .from("project_maps")
      .select("*")
      .eq("project_id", projectId)
      .order("name");

    if (error) {
      console.error("Error loading maps:", error);
      return;
    }

    setMaps(data || []);
    if (data?.length && !selectedMapId) {
      setSelectedMapId(data[0].id);
    }
  };

  const loadAreas = async () => {
    if (!selectedMapId) return;

    try {
      const { data, error } = await supabase
        .from("project_areas")
        .select("*")
        .eq("map_id", selectedMapId);

      if (error) {
        console.error("Error loading areas:", error);
        return;
      }

      setAreas(data || []);
    } catch (error) {
      console.error("Error loading areas:", error);
    }
  };

  const handleMapUpload = async (file: File) => {
    if (!newMapName.trim()) {
      alert("Please enter a map name");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadFile(file, "media");
      if (result?.url) {
        const { data, error } = await supabase
          .from("project_maps")
          .insert({
            project_id: projectId,
            image_url: result.url,
            name: newMapName,
          })
          .select();

        if (error) throw error;

        if (data?.[0]) {
          setSelectedMapId(data[0].id);
          setNewMapName("");
          setIsAddingMap(false);
          await loadMaps();
        }
      }
    } catch (error) {
      console.error("Error uploading map:", error);
      alert("Error uploading map");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveArea = async () => {
    if (!selectedArea && drawingPoints.length < 3) return;

    try {
      const areaData = {
        name: newArea.name,
        description: newArea.description,
        coordinates: { points: drawingPoints },
        color: newArea.color,
        map_id: selectedMapId,
      };

      if (selectedArea) {
        // Update existing area
        const { error } = await supabase
          .from("project_areas")
          .update(areaData)
          .eq("id", selectedArea.id);

        if (error) throw error;
      } else {
        // Create new area
        const { error } = await supabase.from("project_areas").insert(areaData);

        if (error) throw error;
      }

      setDrawingPoints([]);
      setIsAddingArea(false);
      setSelectedArea(null);
      setNewArea({
        name: "",
        description: "",
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      });

      await loadAreas();
    } catch (error) {
      console.error("Error saving area:", error);
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    try {
      const { error } = await supabase
        .from("project_areas")
        .delete()
        .eq("id", areaId);

      if (error) throw error;
      await loadAreas();
    } catch (error) {
      console.error("Error deleting area:", error);
    }
  };

  const handleAreaClick = (area: Area) => {
    setSelectedArea(area);
    setDrawingPoints(area.coordinates.points);
    setNewArea({
      name: area.name,
      description: area.description,
      color: area.color,
    });
  };

  const handleCanvasClick = (event: React.MouseEvent<SVGElement>) => {
    if (!isAddingArea) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setDrawingPoints([...drawingPoints, [x, y]]);
  };

  useEffect(() => {
    loadMaps();
  }, [projectId]);

  useEffect(() => {
    loadAreas();
  }, [selectedMapId]);

  const selectedMap = maps.find((m) => m.id === selectedMapId);

  return (
    <div className="h-full w-full bg-white p-6">
      <div
        className={`flex h-full gap-6 ${isFullscreen ? "fixed inset-0 z-50 bg-white p-6" : ""}`}
      >
        <Card className={`flex-1 p-6 ${isFullscreen ? "w-full" : ""}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-semibold">Project Maps</h2>
              <select
                className="border rounded-md px-3 py-1"
                value={selectedMapId}
                onChange={(e) => setSelectedMapId(e.target.value)}
              >
                {maps.map((map) => (
                  <option key={map.id} value={map.id}>
                    {map.name}
                  </option>
                ))}
              </select>
              <Button variant="outline" onClick={() => setIsAddingMap(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Map
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="relative border rounded-lg overflow-hidden bg-gray-50">
            <svg
              ref={svgRef}
              width="800"
              height="600"
              onClick={handleCanvasClick}
              className="cursor-crosshair"
            >
              {selectedMap?.image_url && (
                <image
                  href={selectedMap.image_url}
                  width="800"
                  height="600"
                  preserveAspectRatio="none"
                />
              )}

              {areas.map((area, index) => (
                <g
                  key={area.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAreaClick(area);
                  }}
                  className="cursor-pointer"
                >
                  <polygon
                    points={area.coordinates.points
                      .map((point) => point.join(","))
                      .join(" ")}
                    fill={area.color}
                    fillOpacity="0.3"
                    stroke={area.color}
                    strokeWidth="2"
                  />
                  <text
                    x={area.coordinates.points[0]?.[0]}
                    y={area.coordinates.points[0]?.[1]}
                    fill={area.color}
                    fontSize="14"
                    fontWeight="bold"
                  >
                    {index + 1}
                  </text>
                </g>
              ))}

              {drawingPoints.length > 0 && (
                <polygon
                  points={drawingPoints
                    .map((point) => point.join(","))
                    .join(" ")}
                  fill={newArea.color}
                  fillOpacity="0.3"
                  stroke={newArea.color}
                  strokeWidth="2"
                />
              )}
            </svg>

            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                variant={isAddingArea ? "default" : "outline"}
                onClick={() => {
                  if (isAddingArea) {
                    setIsAddingArea(false);
                    setDrawingPoints([]);
                  } else {
                    setIsAddingArea(true);
                    setSelectedArea(null);
                  }
                }}
              >
                {isAddingArea ? "Cancel" : "Add Area"}
              </Button>
              {drawingPoints.length >= 3 && (
                <Button onClick={() => setIsAddingArea(false)}>Done</Button>
              )}
            </div>
          </div>

          {(isAddingArea || selectedArea) && (
            <Card className="mt-4 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                  {selectedArea ? "Edit Area" : "New Area"}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsAddingArea(false);
                    setSelectedArea(null);
                    setDrawingPoints([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newArea.name}
                    onChange={(e) =>
                      setNewArea({ ...newArea, name: e.target.value })
                    }
                    placeholder="Enter area name"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={newArea.description}
                    onChange={(e) =>
                      setNewArea({ ...newArea, description: e.target.value })
                    }
                    placeholder="Enter area description"
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <Input
                    type="color"
                    value={newArea.color}
                    onChange={(e) =>
                      setNewArea({ ...newArea, color: e.target.value })
                    }
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSaveArea}
                  disabled={drawingPoints.length < 3}
                >
                  {selectedArea ? "Update Area" : "Save Area"}
                </Button>
              </div>
            </Card>
          )}
        </Card>

        {!isFullscreen && (
          <Card className="w-[300px] p-6">
            <h3 className="text-lg font-medium mb-4">Map Areas</h3>
            <ScrollArea className="h-[calc(100%-2rem)]">
              <div className="space-y-4">
                {areas.map((area, index) => (
                  <div
                    key={area.id}
                    className={`p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
                      selectedArea?.id === area.id ? "border-primary" : ""
                    }`}
                    onClick={() => handleAreaClick(area)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 font-medium text-sm">
                          {index + 1}
                        </div>
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: area.color }}
                        />
                        <h4 className="font-medium">{area.name}</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteArea(area.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {area.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {area.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}
      </div>

      <Dialog open={isAddingMap} onOpenChange={setIsAddingMap}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Map</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Map Name</Label>
              <Input
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                placeholder="Enter map name"
              />
            </div>
            <div className="space-y-2">
              <Label>Map Image</Label>
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Map className="w-12 h-12 mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supported formats: PNG, JPG
                </p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleMapUpload(file);
                }}
                className="hidden"
                accept="image/*"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectMapComponent;
