#!/usr/bin/env python3
"""
Quad Tree Demonstration for Infinite Zoom Vector Graphics
A Python implementation to illustrate the core concepts
"""

import random
import math
from typing import List, Tuple, Optional

class Point:
    """2D Point representation"""
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y
    
    def __repr__(self):
        return f"Point({self.x}, {self.y})"

class Rectangle:
    """Rectangle representation for spatial bounds"""
    def __init__(self, x: float, y: float, width: float, height: float):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
    
    def contains(self, point: Point) -> bool:
        """Check if point is within rectangle"""
        return (self.x <= point.x < self.x + self.width and
                self.y <= point.y < self.y + self.height)
    
    def intersects(self, other: 'Rectangle') -> bool:
        """Check if this rectangle intersects with another"""
        return not (other.x >= self.x + self.width or
                   other.x + other.width <= self.x or
                   other.y >= self.y + self.height or
                   other.y + other.height <= self.y)
    
    def __repr__(self):
        return f"Rectangle({self.x}, {self.y}, {self.width}, {self.height})"

class VectorObject:
    """Base class for vector objects with bounds"""
    def __init__(self, x: float, y: float, size: float):
        self.x = x
        self.y = y
        self.size = size
        self.min_zoom = 0.01
        self.max_zoom = 1000.0
    
    def get_bounds(self) -> Rectangle:
        """Get bounding rectangle"""
        half_size = self.size / 2
        return Rectangle(self.x - half_size, self.y - half_size, 
                        self.size, self.size)
    
    def should_render_at_zoom(self, zoom_level: float, lod_threshold: float) -> bool:
        """Determine if object should be rendered at zoom level"""
        if zoom_level < self.min_zoom or zoom_level > self.max_zoom:
            return False
        screen_size = self.size * zoom_level
        return screen_size >= lod_threshold
    
    def __repr__(self):
        return f"VectorObject({self.x}, {self.y}, {self.size})"

class QuadTree:
    """Quad Tree implementation for spatial partitioning"""
    
    def __init__(self, boundary: Rectangle, max_objects: int = 10, 
                 max_levels: int = 5, level: int = 0):
        self.boundary = boundary
        self.max_objects = max_objects
        self.max_levels = max_levels
        self.level = level
        self.objects: List[VectorObject] = []
        self.nodes: List['QuadTree'] = []
        self.divided = False
    
    def subdivide(self):
        """Split current node into 4 quadrants"""
        x, y = self.boundary.x, self.boundary.y
        w, h = self.boundary.width / 2, self.boundary.height / 2
        
        # Create 4 child nodes: NW, NE, SW, SE
        self.nodes = [
            QuadTree(Rectangle(x, y, w, h), self.max_objects, self.max_levels, self.level + 1),
            QuadTree(Rectangle(x + w, y, w, h), self.max_objects, self.max_levels, self.level + 1),
            QuadTree(Rectangle(x, y + h, w, h), self.max_objects, self.max_levels, self.level + 1),
            QuadTree(Rectangle(x + w, y + h, w, h), self.max_objects, self.max_levels, self.level + 1)
        ]
        self.divided = True
    
    def get_index(self, obj_bounds: Rectangle) -> int:
        """Get the index of the node that would contain the object"""
        if not self.divided:
            return -1
        
        vertical_midpoint = self.boundary.x + self.boundary.width / 2
        horizontal_midpoint = self.boundary.y + self.boundary.height / 2
        
        top_quadrant = (obj_bounds.y < horizontal_midpoint and 
                       obj_bounds.y + obj_bounds.height < horizontal_midpoint)
        bottom_quadrant = obj_bounds.y > horizontal_midpoint
        
        if (obj_bounds.x < vertical_midpoint and 
            obj_bounds.x + obj_bounds.width < vertical_midpoint):
            if top_quadrant:
                return 0  # NW
            elif bottom_quadrant:
                return 2  # SW
        elif obj_bounds.x > vertical_midpoint:
            if top_quadrant:
                return 1  # NE
            elif bottom_quadrant:
                return 3  # SE
        
        return -1  # Object doesn't fit entirely in any quadrant
    
    def insert(self, obj: VectorObject) -> bool:
        """Insert object into quad tree"""
        if not self.boundary.intersects(obj.get_bounds()):
            return False
        
        if len(self.objects) < self.max_objects or self.level >= self.max_levels:
            self.objects.append(obj)
            return True
        
        if not self.divided:
            self.subdivide()
        
        index = self.get_index(obj.get_bounds())
        if index != -1:
            return self.nodes[index].insert(obj)
        
        self.objects.append(obj)
        return True
    
    def query(self, range_rect: Rectangle) -> List[VectorObject]:
        """Query objects within a given range"""
        found = []
        
        if not self.boundary.intersects(range_rect):
            return found
        
        # Check objects in this node
        for obj in self.objects:
            if range_rect.intersects(obj.get_bounds()):
                found.append(obj)
        
        # Check child nodes
        if self.divided:
            for node in self.nodes:
                found.extend(node.query(range_rect))
        
        return found
    
    def query_lod(self, range_rect: Rectangle, zoom_level: float) -> List[VectorObject]:
        """Query objects with level of detail consideration"""
        found = []
        
        if not self.boundary.intersects(range_rect):
            return found
        
        lod_threshold = max(0.5, 2.0 / zoom_level)
        
        # Check objects in this node
        for obj in self.objects:
            if (range_rect.intersects(obj.get_bounds()) and 
                obj.should_render_at_zoom(zoom_level, lod_threshold)):
                found.append(obj)
        
        # Check child nodes if zoom level is appropriate
        if self.divided and self.should_traverse_at_zoom(zoom_level):
            for node in self.nodes:
                found.extend(node.query_lod(range_rect, zoom_level))
        
        return found
    
    def should_traverse_at_zoom(self, zoom_level: float) -> bool:
        """Determine if we should traverse child nodes at this zoom level"""
        max_depth_at_zoom = min(self.max_levels, int(math.log2(zoom_level)) + 3)
        return self.level < max_depth_at_zoom
    
    def get_node_count(self) -> int:
        """Get total number of nodes in the tree"""
        count = 1
        if self.divided:
            for node in self.nodes:
                count += node.get_node_count()
        return count
    
    def get_all_objects(self) -> List[VectorObject]:
        """Get all objects in the tree"""
        all_objects = self.objects.copy()
        if self.divided:
            for node in self.nodes:
                all_objects.extend(node.get_all_objects())
        return all_objects
    
    def clear(self):
        """Clear all objects from the tree"""
        self.objects.clear()
        self.nodes.clear()
        self.divided = False

def create_random_objects(bounds: Rectangle, count: int) -> List[VectorObject]:
    """Create random vector objects within bounds"""
    objects = []
    for _ in range(count):
        x = bounds.x + random.random() * bounds.width
        y = bounds.y + random.random() * bounds.height
        size = random.uniform(5, 50)
        objects.append(VectorObject(x, y, size))
    return objects

def demonstrate_infinite_zoom():
    """Demonstrate infinite zoom capabilities"""
    print("=== Infinite Zoom Vector Graphics Demo ===\n")
    
    # Create a large world space
    world_bounds = Rectangle(-1000, -1000, 2000, 2000)
    quad_tree = QuadTree(world_bounds, max_objects=8, max_levels=6)
    
    # Generate random objects
    objects = create_random_objects(world_bounds, 1000)
    
    print(f"Inserting {len(objects)} objects into quad tree...")
    for obj in objects:
        quad_tree.insert(obj)
    
    print(f"Quad tree has {quad_tree.get_node_count()} nodes")
    print(f"Total objects: {len(quad_tree.get_all_objects())}")
    
    # Simulate different zoom levels and viewport queries
    zoom_levels = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 50.0]
    viewport_size = 100  # Fixed viewport size
    
    print("\n=== Zoom Level Analysis ===")
    for zoom in zoom_levels:
        # Calculate viewport in world coordinates
        world_viewport_size = viewport_size / zoom
        viewport = Rectangle(-world_viewport_size/2, -world_viewport_size/2, 
                           world_viewport_size, world_viewport_size)
        
        # Query without LOD
        all_visible = quad_tree.query(viewport)
        
        # Query with LOD
        lod_visible = quad_tree.query_lod(viewport, zoom)
        
        print(f"Zoom {zoom:4.1f}x: {len(all_visible):3d} objects in viewport, "
              f"{len(lod_visible):3d} after LOD culling")
    
    # Demonstrate fractal-like behavior
    print("\n=== Fractal Pattern Demo ===")
    fractal_tree = QuadTree(Rectangle(-100, -100, 200, 200), max_objects=4, max_levels=8)
    
    # Create fractal pattern
    def generate_fractal(x, y, size, depth, max_depth=6):
        if depth > max_depth or size < 1:
            return
        
        # Create object at current level
        obj = VectorObject(x, y, size)
        obj.min_zoom = 2 ** (depth - 1) if depth > 1 else 0.01
        fractal_tree.insert(obj)
        
        # Create smaller objects around this one
        for i in range(4):
            angle = (i / 4) * 2 * math.pi
            branch_x = x + math.cos(angle) * size
            branch_y = y + math.sin(angle) * size
            generate_fractal(branch_x, branch_y, size / 2.5, depth + 1, max_depth)
    
    generate_fractal(0, 0, 50, 0)
    
    print(f"Fractal tree has {fractal_tree.get_node_count()} nodes")
    print(f"Total fractal objects: {len(fractal_tree.get_all_objects())}")
    
    # Test fractal at different zoom levels
    print("\nFractal visibility at different zoom levels:")
    for zoom in [0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0]:
        viewport = Rectangle(-25, -25, 50, 50)
        visible = fractal_tree.query_lod(viewport, zoom)
        print(f"Zoom {zoom:4.1f}x: {len(visible):2d} fractal objects visible")

def performance_test():
    """Test performance characteristics"""
    print("\n=== Performance Test ===")
    
    import time
    
    # Test with increasing object counts
    object_counts = [100, 500, 1000, 5000, 10000]
    
    for count in object_counts:
        bounds = Rectangle(-1000, -1000, 2000, 2000)
        quad_tree = QuadTree(bounds, max_objects=10, max_levels=6)
        objects = create_random_objects(bounds, count)
        
        # Time insertion
        start_time = time.time()
        for obj in objects:
            quad_tree.insert(obj)
        insert_time = time.time() - start_time
        
        # Time queries
        query_viewport = Rectangle(-50, -50, 100, 100)
        start_time = time.time()
        for _ in range(100):  # 100 queries
            quad_tree.query(query_viewport)
        query_time = time.time() - start_time
        
        print(f"{count:5d} objects: Insert {insert_time*1000:6.1f}ms, "
              f"Query {query_time*1000:6.1f}ms (100 queries)")

if __name__ == "__main__":
    demonstrate_infinite_zoom()
    performance_test()
    
    print("\n=== Key Concepts Demonstrated ===")
    print("1. Quad Tree Spatial Partitioning")
    print("2. Level of Detail (LOD) Culling")
    print("3. Viewport-based Query Optimization")
    print("4. Fractal/Recursive Content Generation")
    print("5. Performance Scaling with Object Count")
    print("\nSee the HTML/JavaScript implementation for the full interactive demo!") 