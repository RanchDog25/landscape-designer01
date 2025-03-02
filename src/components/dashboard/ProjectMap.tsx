import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, X, Maximize2, Minimize2, Map, Edit } from "lucide-react";
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
  isAllProjects?: boolean;
}

const ProjectMapComponent: React.FC<ProjectMapProps> = ({
  projectId,
  isAllProjects = false,
}) => {
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
  const [isEditingPoints, setIsEditingPoints] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(
    null,
  );

  // State for project selection when in All Projects view
  const [selectedProjectForMap, setSelectedProjectForMap] =
    useState<string>("");
  const [projectsList, setProjectsList] = useState<
    { id: string; name: string }[]
  >([]);

  // Load projects for the dropdown
  useEffect(() => {
    if (isAllProjects) {
      const loadProjects = async () => {
        const { data } = await supabase
          .from("projects")
          .select("id, name")
          .is("deleted_at", null)
          .order("name");

        setProjectsList(data || []);
        if (data && data.length > 0) {
          setSelectedProjectForMap(data[0].id);
        }
      };

      loadProjects();
    }
  }, [isAllProjects]);

  const loadMaps = async () => {
    // Clear maps first to prevent stale data
    setMaps([]);

    let query = supabase
      .from("project_maps")
      .select("*, projects(name)")
      .order("name");

    // Only filter by project if not in "All Projects" view
    if (!isAllProjects && projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading maps:", error);
      return;
    }

    setMaps(data || []);
    if (data?.length) {
      setSelectedMapId(data[0].id);
    }
  };

  const loadAreas = async () => {
    if (!selectedMapId) return;

    try {
      // First clear existing areas to prevent stale data
      setAreas([]);

      const { data, error } = await supabase
        .from("project_areas")
        .select("*")
        .eq("map_id", selectedMapId);

      if (error) {
        console.error("Error loading areas:", error);
        return;
      }

      // Only set areas if we're still on the same map
      // This prevents race conditions when switching maps quickly
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

    // Determine which project ID to use
    const targetProjectId = isAllProjects ? selectedProjectForMap : projectId;
    if (!targetProjectId) {
      alert("Please select a project");
      return;
    }

    setIsUploading(true);
    try {
      // Direct upload to storage without using uploadFile function
      const fileExt = file.name.split(".").pop();
      const fileName = `map_${Math.random().toString(36).slice(2)}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Create project map record
      const { data, error } = await supabase
        .from("project_maps")
        .insert({
          project_id: targetProjectId,
          image_url: imageUrl,
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

    // If we're in edit mode, set the editing area ID
    if (isEditingPoints) {
      setEditingAreaId(area.id);
    }
  };

  const startEditingPoints = (area: Area) => {
    setIsEditingPoints(true);
    setEditingAreaId(area.id);
    setSelectedArea(area);
    setDrawingPoints(area.coordinates.points);
    setNewArea({
      name: area.name,
      description: area.description,
      color: area.color,
    });
  };

  const stopEditingPoints = () => {
    setIsEditingPoints(false);
    setEditingAreaId(null);
  };

  const deletePoint = (index: number) => {
    if (drawingPoints.length <= 3) {
      alert("Cannot delete point. Area must have at least 3 points.");
      return;
    }

    const newPoints = [...drawingPoints];
    newPoints.splice(index, 1);
    setDrawingPoints(newPoints);
  };

  const handleCanvasClick = (event: React.MouseEvent<SVGElement>) => {
    if (!isAddingArea && !isEditingPoints) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (isAddingArea) {
      setDrawingPoints([...drawingPoints, [x, y]]);
    } else if (isEditingPoints) {
      // Add a new point between the closest two existing points
      if (drawingPoints.length >= 2) {
        let minDistance = Infinity;
        let insertIndex = 0;

        // Find the closest line segment to insert the new point
        for (let i = 0; i < drawingPoints.length; i++) {
          const nextIndex = (i + 1) % drawingPoints.length;
          const p1 = drawingPoints[i];
          const p2 = drawingPoints[nextIndex];

          // Calculate distance from point to line segment
          const distance = distanceToLineSegment(p1, p2, [x, y]);

          if (distance < minDistance) {
            minDistance = distance;
            insertIndex = nextIndex;
          }
        }

        // Insert the new point at the determined position
        const newPoints = [...drawingPoints];
        newPoints.splice(insertIndex, 0, [x, y]);
        setDrawingPoints(newPoints);
      }
    }
  };

  // Helper function to calculate distance from point to line segment
  const distanceToLineSegment = (
    p1: [number, number],
    p2: [number, number],
    p: [number, number],
  ): number => {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    const [x, y] = p;

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;

    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePointMouseDown = (index: number) => {
    setDraggedPointIndex(index);
  };

  const handlePointMouseUp = () => {
    setDraggedPointIndex(null);
  };

  const handlePointMouseMove = (event: React.MouseEvent<SVGElement>) => {
    if (draggedPointIndex === null || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newPoints = [...drawingPoints];
    newPoints[draggedPointIndex] = [x, y];
    setDrawingPoints(newPoints);
  };

  useEffect(() => {
    loadMaps();
    // Reset areas and selected map when project changes
    setAreas([]);
    setSelectedMapId(undefined);
    setSelectedArea(null);
    setDrawingPoints([]);
    setIsAddingArea(false);
    setIsEditingPoints(false);
    setEditingAreaId(null);
  }, [projectId]);

  useEffect(() => {
    if (selectedMapId) {
      loadAreas();
    } else {
      setAreas([]);
    }
  }, [selectedMapId, projectId]);

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
              <div className="flex items-center gap-2">
                <select
                  className="border rounded-md px-3 py-1"
                  value={selectedMapId}
                  onChange={(e) => setSelectedMapId(e.target.value)}
                >
                  {maps.map((map) => (
                    <option key={map.id} value={map.id}>
                      {map.name}{" "}
                      {map.projects?.name ? `(${map.projects.name})` : ""}
                    </option>
                  ))}
                </select>

                {isAllProjects && (
                  <select
                    className="border rounded-md px-3 py-1"
                    value={selectedProjectForMap}
                    onChange={(e) => setSelectedProjectForMap(e.target.value)}
                  >
                    {projectsList.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
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
              onMouseMove={handlePointMouseMove}
              onMouseUp={handlePointMouseUp}
              className={`${isAddingArea || isEditingPoints ? "cursor-crosshair" : "cursor-default"}`}
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
                    fillOpacity="0.6"
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

                  {/* Show points when in edit mode and this area is selected */}
                  {isEditingPoints &&
                    editingAreaId === area.id &&
                    area.coordinates.points.map((point, pointIndex) => (
                      <g key={`point-${pointIndex}`}>
                        <circle
                          cx={point[0]}
                          cy={point[1]}
                          r={6}
                          fill="white"
                          stroke={area.color}
                          strokeWidth="2"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handlePointMouseDown(pointIndex);
                          }}
                          className="cursor-move"
                        />
                        <text
                          x={point[0] + 10}
                          y={point[1] - 10}
                          fill="black"
                          fontSize="10"
                          className="pointer-events-none"
                        >
                          {pointIndex + 1}
                        </text>
                      </g>
                    ))}
                </g>
              ))}

              {drawingPoints.length > 0 && (
                <g>
                  <polygon
                    points={drawingPoints
                      .map((point) => point.join(","))
                      .join(" ")}
                    fill={newArea.color}
                    fillOpacity="0.6"
                    stroke={newArea.color}
                    strokeWidth="2"
                  />

                  {/* Show points when in edit mode */}
                  {isEditingPoints &&
                    drawingPoints.map((point, pointIndex) => (
                      <g key={`editing-point-${pointIndex}`}>
                        <circle
                          cx={point[0]}
                          cy={point[1]}
                          r={6}
                          fill="white"
                          stroke={newArea.color}
                          strokeWidth="2"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handlePointMouseDown(pointIndex);
                          }}
                          className="cursor-move"
                        />
                        <text
                          x={point[0] + 10}
                          y={point[1] - 10}
                          fill="black"
                          fontSize="10"
                          className="pointer-events-none"
                        >
                          {pointIndex + 1}
                        </text>
                        {/* Delete point button */}
                        <circle
                          cx={point[0] - 10}
                          cy={point[1] - 10}
                          r={5}
                          fill="red"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePoint(pointIndex);
                          }}
                          className="cursor-pointer"
                        />
                        <text
                          x={point[0] - 10}
                          y={point[1] - 10}
                          fill="white"
                          fontSize="10"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePoint(pointIndex);
                          }}
                          className="cursor-pointer"
                        >
                          x
                        </text>
                      </g>
                    ))}
                </g>
              )}
            </svg>

            <div className="absolute top-4 right-4 flex gap-2">
              {!isEditingPoints && (
                <Button
                  variant={isAddingArea ? "default" : "outline"}
                  onClick={() => {
                    if (isAddingArea) {
                      setIsAddingArea(false);
                      setDrawingPoints([]);
                    } else {
                      setIsAddingArea(true);
                      setSelectedArea(null);
                      setIsEditingPoints(false);
                      setEditingAreaId(null);
                    }
                  }}
                >
                  {isAddingArea ? "Cancel" : "Add Area"}
                </Button>
              )}

              {selectedArea && !isAddingArea && !isEditingPoints && (
                <Button
                  variant="outline"
                  onClick={() => startEditingPoints(selectedArea)}
                >
                  Edit Points
                </Button>
              )}

              {isEditingPoints && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Click anywhere to add a new point
                      alert(
                        "Click on the map to add a new point between existing points",
                      );
                    }}
                  >
                    Add Point
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      stopEditingPoints();
                      // Reset to original points if needed
                      if (selectedArea) {
                        setDrawingPoints(selectedArea.coordinates.points);
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (drawingPoints.length < 3) {
                        alert("Area must have at least 3 points");
                        return;
                      }
                      await handleSaveArea();
                      stopEditingPoints();
                    }}
                  >
                    Save Changes
                  </Button>
                </>
              )}

              {isAddingArea && drawingPoints.length >= 3 && (
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
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingPoints(area);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
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
