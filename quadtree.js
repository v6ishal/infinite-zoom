/**
 * QuadTree Implementation for Infinite Zoom Vector Graphics
 * Handles spatial partitioning and efficient culling of vector objects
 */

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Rectangle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    
    contains(point) {
        return (point.x >= this.x && point.x < this.x + this.width &&
                point.y >= this.y && point.y < this.y + this.height);
    }
    
    intersects(other) {
        return !(other.x >= this.x + this.width ||
                other.x + other.width <= this.x ||
                other.y >= this.y + this.height ||
                other.y + other.height <= this.y);
    }
    
    getCenter() {
        return new Point(this.x + this.width / 2, this.y + this.height / 2);
    }
}

class QuadTree {
    constructor(boundary, maxObjects = 10, maxLevels = 10, level = 0) {
        this.boundary = boundary;
        this.maxObjects = maxObjects;
        this.maxLevels = maxLevels;
        this.level = level;
        this.objects = [];
        this.nodes = [];
        this.divided = false;
        this.nodeCount = 1; // Count this node
    }
    
    // Split the current node into 4 quadrants
    subdivide() {
        const x = this.boundary.x;
        const y = this.boundary.y;
        const w = this.boundary.width / 2;
        const h = this.boundary.height / 2;
        
        // Create 4 child nodes
        this.nodes[0] = new QuadTree(new Rectangle(x, y, w, h), this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[1] = new QuadTree(new Rectangle(x + w, y, w, h), this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[2] = new QuadTree(new Rectangle(x, y + h, w, h), this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[3] = new QuadTree(new Rectangle(x + w, y + h, w, h), this.maxObjects, this.maxLevels, this.level + 1);
        
        this.divided = true;
        this.nodeCount += 4;
    }
    
    // Get the index of the node that would contain the object
    getIndex(objectBounds) {
        if (!this.divided) return -1;
        
        const verticalMidpoint = this.boundary.x + this.boundary.width / 2;
        const horizontalMidpoint = this.boundary.y + this.boundary.height / 2;
        
        const topQuadrant = objectBounds.y < horizontalMidpoint && 
                           objectBounds.y + objectBounds.height < horizontalMidpoint;
        const bottomQuadrant = objectBounds.y > horizontalMidpoint;
        
        if (objectBounds.x < verticalMidpoint && objectBounds.x + objectBounds.width < verticalMidpoint) {
            if (topQuadrant) return 0;
            if (bottomQuadrant) return 2;
        } else if (objectBounds.x > verticalMidpoint) {
            if (topQuadrant) return 1;
            if (bottomQuadrant) return 3;
        }
        
        return -1; // Object doesn't fit entirely in any quadrant
    }
    
    // Insert an object into the quadtree
    insert(object) {
        if (!this.boundary.intersects(object.getBounds())) {
            return false;
        }
        
        if (this.objects.length < this.maxObjects || this.level >= this.maxLevels) {
            this.objects.push(object);
            return true;
        }
        
        if (!this.divided) {
            this.subdivide();
        }
        
        const index = this.getIndex(object.getBounds());
        if (index !== -1) {
            return this.nodes[index].insert(object);
        }
        
        this.objects.push(object);
        return true;
    }
    
    // Query objects within a given range
    query(range, found = []) {
        if (!this.boundary.intersects(range)) {
            return found;
        }
        
        // Check objects in this node
        for (const object of this.objects) {
            if (range.intersects(object.getBounds())) {
                found.push(object);
            }
        }
        
        // Check child nodes
        if (this.divided) {
            for (const node of this.nodes) {
                node.query(range, found);
            }
        }
        
        return found;
    }
    
    // Query objects with level of detail consideration
    queryLOD(range, zoomLevel, found = []) {
        if (!this.boundary.intersects(range)) {
            return found;
        }
        
        // Calculate appropriate level of detail based on zoom
        const lodThreshold = this.calculateLODThreshold(zoomLevel);
        
        // Check objects in this node
        for (const object of this.objects) {
            if (range.intersects(object.getBounds())) {
                // Only include objects that should be visible at this zoom level
                if (object.shouldRenderAtZoom(zoomLevel, lodThreshold)) {
                    found.push(object);
                }
            }
        }
        
        // Recursively check child nodes, but only if zoom level is appropriate
        if (this.divided && this.shouldTraverseAtZoom(zoomLevel)) {
            for (const node of this.nodes) {
                node.queryLOD(range, zoomLevel, found);
            }
        }
        
        return found;
    }
    
    // Calculate LOD threshold based on zoom level
    calculateLODThreshold(zoomLevel) {
        // Objects smaller than this threshold won't be rendered
        // For extreme zoom levels, we need a more conservative threshold
        if (zoomLevel > 10000) {
            // At extreme zoom levels, use a logarithmic scale
            return Math.max(0.1, 1.0 / Math.log10(zoomLevel));
        }
        return Math.max(0.5, 2.0 / zoomLevel);
    }
    
    // Determine if we should traverse child nodes at this zoom level
    shouldTraverseAtZoom(zoomLevel) {
        // Don't traverse too deep when zoomed out
        let maxDepthAtZoom;
        if (zoomLevel > 10000) {
            // For extreme zoom levels, cap the depth more conservatively
            maxDepthAtZoom = Math.min(this.maxLevels, Math.floor(Math.log2(zoomLevel)) + 2);
        } else {
            maxDepthAtZoom = Math.min(this.maxLevels, Math.floor(Math.log2(zoomLevel)) + 3);
        }
        return this.level < maxDepthAtZoom;
    }
    
    // Clear all objects from the quadtree
    clear() {
        this.objects = [];
        this.nodes = [];
        this.divided = false;
        this.nodeCount = 1;
    }
    
    // Get total node count (for statistics)
    getNodeCount() {
        let count = 1;
        if (this.divided) {
            for (const node of this.nodes) {
                count += node.getNodeCount();
            }
        }
        return count;
    }
    
    // Get all objects in the tree (for statistics)
    getAllObjects() {
        let allObjects = [...this.objects];
        if (this.divided) {
            for (const node of this.nodes) {
                allObjects = allObjects.concat(node.getAllObjects());
            }
        }
        return allObjects;
    }
    
    // Draw the quadtree boundaries (for debugging)
    draw(ctx, zoomLevel = 1, viewport = null) {
        if (viewport && !viewport.intersects(this.boundary)) {
            return;
        }
        
        // Only draw boundaries if they're large enough to see
        const minSize = 5 / zoomLevel;
        if (this.boundary.width < minSize || this.boundary.height < minSize) {
            return;
        }
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 / (this.level + 1)})`;
        ctx.lineWidth = 1 / zoomLevel;
        ctx.strokeRect(this.boundary.x, this.boundary.y, this.boundary.width, this.boundary.height);
        
        if (this.divided) {
            for (const node of this.nodes) {
                node.draw(ctx, zoomLevel, viewport);
            }
        }
    }
    
    // Rebuild the quadtree (useful for dynamic objects)
    rebuild() {
        const allObjects = this.getAllObjects();
        this.clear();
        for (const object of allObjects) {
            this.insert(object);
        }
    }
    
    // Memory estimation (for statistics)
    estimateMemoryUsage() {
        let size = 0;
        size += this.objects.length * 100; // Rough estimate per object
        size += 200; // Node overhead
        
        if (this.divided) {
            for (const node of this.nodes) {
                size += node.estimateMemoryUsage();
            }
        }
        
        return size;
    }
} 

/**
 * Multi-Level Quad Tree Manager
 * Manages separate quadtrees for each zoom level to avoid scaling issues
 */
class MultiLevelQuadTree {
    constructor(baseBounds, maxObjects = 8, maxLevels = 12) {
        this.baseBounds = baseBounds;
        this.maxObjects = maxObjects;
        this.maxLevels = maxLevels;
        
        // Store quadtrees for each level
        this.levelQuadTrees = new Map(); // level -> QuadTree
        this.currentLevel = 0;
        
        // Create initial quadtree for level 0
        this.createQuadTreeForLevel(0);
    }
    
    // Create a new quadtree for a specific level
    createQuadTreeForLevel(level) {
        if (this.levelQuadTrees.has(level)) {
            return this.levelQuadTrees.get(level);
        }
        
        // Create quadtree with base bounds for this level
        const quadTree = new QuadTree(
            new Rectangle(
                this.baseBounds.x,
                this.baseBounds.y,
                this.baseBounds.width,
                this.baseBounds.height
            ),
            this.maxObjects,
            this.maxLevels
        );
        
        this.levelQuadTrees.set(level, quadTree);
        console.log(`[MULTI-LEVEL] Created quadtree for level ${level}`);
        return quadTree;
    }
    
    // Get the quadtree for a specific level
    getQuadTreeForLevel(level) {
        if (!this.levelQuadTrees.has(level)) {
            return this.createQuadTreeForLevel(level);
        }
        return this.levelQuadTrees.get(level);
    }
    
    // Get the current level's quadtree
    getCurrentQuadTree() {
        return this.getQuadTreeForLevel(this.currentLevel);
    }
    
    // Set the current level
    setCurrentLevel(level) {
        this.currentLevel = level;
        console.log(`[MULTI-LEVEL] Switched to level ${level}`);
        
        // Ensure quadtree exists for this level
        if (!this.levelQuadTrees.has(level)) {
            this.createQuadTreeForLevel(level);
        }
    }
    
    // Insert object into current level's quadtree
    insert(object) {
        const currentQuadTree = this.getCurrentQuadTree();
        return currentQuadTree.insert(object);
    }
    
    // Query objects from current level's quadtree
    query(range, found = []) {
        const currentQuadTree = this.getCurrentQuadTree();
        return currentQuadTree.query(range, found);
    }
    
    // Query objects with LOD from current level's quadtree
    queryLOD(range, zoomLevel, found = []) {
        const currentQuadTree = this.getCurrentQuadTree();
        return currentQuadTree.queryLOD(range, zoomLevel, found);
    }
    
    // Get all objects from current level
    getAllObjects() {
        const currentQuadTree = this.getCurrentQuadTree();
        return currentQuadTree.getAllObjects();
    }
    
    // Get all objects from all levels (for debugging and statistics)
    getAllObjectsAllLevels() {
        let allObjects = [];
        for (const [level, quadTree] of this.levelQuadTrees) {
            const levelObjects = quadTree.getAllObjects();
            allObjects = allObjects.concat(levelObjects);
        }
        return allObjects;
    }
    
    // Get all objects from a specific level
    getAllObjectsFromLevel(level) {
        const quadTree = this.getQuadTreeForLevel(level);
        return quadTree.getAllObjects();
    }
    
    // Clear current level's quadtree
    clear() {
        const currentQuadTree = this.getCurrentQuadTree();
        currentQuadTree.clear();
    }
    
    // Clear all levels
    clearAllLevels() {
        for (const [level, quadTree] of this.levelQuadTrees) {
            quadTree.clear();
        }
        console.log(`[MULTI-LEVEL] Cleared all ${this.levelQuadTrees.size} levels`);
    }
    
    // Rebuild current level's quadtree
    rebuild() {
        const currentQuadTree = this.getCurrentQuadTree();
        currentQuadTree.rebuild();
    }
    
    // Get node count for current level
    getNodeCount() {
        const currentQuadTree = this.getCurrentQuadTree();
        return currentQuadTree.getNodeCount();
    }
    
    // Get total node count across all levels
    getTotalNodeCount() {
        let totalNodes = 0;
        for (const [level, quadTree] of this.levelQuadTrees) {
            totalNodes += quadTree.getNodeCount();
        }
        return totalNodes;
    }
    
    // Get statistics about all levels
    getLevelStats() {
        const stats = {
            totalLevels: this.levelQuadTrees.size,
            currentLevel: this.currentLevel,
            levels: []
        };
        
        for (const [level, quadTree] of this.levelQuadTrees) {
            stats.levels.push({
                level: level,
                objectCount: quadTree.getAllObjects().length,
                nodeCount: quadTree.getNodeCount(),
                isCurrent: level === this.currentLevel
            });
        }
        
        return stats;
    }
    
    // Transfer objects from one level to another with proper scaling
    transferObjectsToLevel(fromLevel, toLevel, scaleFactor = 1.0, centerX = 0, centerY = 0) {
        const fromQuadTree = this.getQuadTreeForLevel(fromLevel);
        const toQuadTree = this.getQuadTreeForLevel(toLevel);
        
        const objects = fromQuadTree.getAllObjects();
        console.log(`[MULTI-LEVEL] Transferring ${objects.length} objects from level ${fromLevel} to level ${toLevel}`);
        console.log(`[MULTI-LEVEL] Scale factor: ${scaleFactor}, Center: (${centerX.toFixed(2)}, ${centerY.toFixed(2)})`);
        
        // Clear source level
        fromQuadTree.clear();
        
        // Transfer objects with scaling
        let transferredCount = 0;
        for (const obj of objects) {
            // Log object state before scaling
            if (transferredCount < 2) { // Only log first 2 objects to avoid spam
                console.log(`[MULTI-LEVEL] Object ${transferredCount} BEFORE scaling:`, {
                    type: obj.constructor.name,
                    x: obj.x || obj.x1,
                    y: obj.y || obj.y1,
                    size: obj.radius || obj.width || 'line'
                });
            }
            
            // Scale the object if needed
            if (scaleFactor !== 1.0) {
                this.scaleObjectRelativeToPoint(obj, scaleFactor, centerX, centerY);
            }
            
            // Log object state after scaling
            if (transferredCount < 2) { // Only log first 2 objects to avoid spam
                console.log(`[MULTI-LEVEL] Object ${transferredCount} AFTER scaling:`, {
                    type: obj.constructor.name,
                    x: obj.x || obj.x1,
                    y: obj.y || obj.y1,
                    size: obj.radius || obj.width || 'line'
                });
            }
            
            // Check if object fits in quadtree bounds
            const objBounds = this.getObjectBounds(obj);
            const quadBounds = toQuadTree.boundary;
            
            // If object exceeds bounds, expand the quadtree
            if (objBounds.x < quadBounds.x || 
                objBounds.y < quadBounds.y ||
                objBounds.x + objBounds.width > quadBounds.x + quadBounds.width ||
                objBounds.y + objBounds.height > quadBounds.y + quadBounds.height) {
                
                console.log(`[MULTI-LEVEL] Object ${transferredCount} exceeds bounds, expanding quadtree`);
                this.expandQuadTreeBounds(toQuadTree, objBounds);
            }
            
            // Insert into target level
            toQuadTree.insert(obj);
            transferredCount++;
        }
        
        console.log(`[MULTI-LEVEL] Transfer complete: ${transferredCount} objects moved to level ${toLevel}`);
        
        // Verify scaling worked correctly
        if (objects.length > 0) {
            const testObj = objects[0];
            console.log(`[MULTI-LEVEL] First object final state:`, {
                type: testObj.constructor.name,
                x: testObj.x || testObj.x1,
                y: testObj.y || testObj.y1,
                size: testObj.radius || testObj.width || 'line'
            });
        }
        
        // Rebuild the target quadtree to ensure optimal performance
        toQuadTree.rebuild();
    }
    
    // Scale an object relative to a point
    scaleObjectRelativeToPoint(obj, scaleFactor, centerX, centerY) {
        try {
            if (obj.constructor.name === 'VectorCircle') {
                obj.x = centerX + (obj.x - centerX) * scaleFactor;
                obj.y = centerY + (obj.y - centerY) * scaleFactor;
                obj.radius *= scaleFactor;
            } else if (obj.constructor.name === 'VectorRectangle') {
                obj.x = centerX + (obj.x - centerX) * scaleFactor;
                obj.y = centerY + (obj.y - centerY) * scaleFactor;
                obj.width *= scaleFactor;
                obj.height *= scaleFactor;
            } else if (obj.constructor.name === 'VectorLine') {
                obj.x1 = centerX + (obj.x1 - centerX) * scaleFactor;
                obj.y1 = centerY + (obj.y1 - centerY) * scaleFactor;
                obj.x2 = centerX + (obj.x2 - centerX) * scaleFactor;
                obj.y2 = centerY + (obj.y2 - centerY) * scaleFactor;
            } else if (obj.constructor.name === 'VectorBezier') {
                obj.x1 = centerX + (obj.x1 - centerX) * scaleFactor;
                obj.y1 = centerY + (obj.y1 - centerY) * scaleFactor;
                obj.x2 = centerX + (obj.x2 - centerX) * scaleFactor;
                obj.y2 = centerY + (obj.y2 - centerY) * scaleFactor;
                obj.cp1x = centerX + (obj.cp1x - centerX) * scaleFactor;
                obj.cp1y = centerY + (obj.cp1y - centerY) * scaleFactor;
                obj.cp2x = centerX + (obj.cp2x - centerX) * scaleFactor;
                obj.cp2y = centerY + (obj.cp2y - centerY) * scaleFactor;
            } else if (obj.constructor.name === 'VectorText') {
                obj.x = centerX + (obj.x - centerX) * scaleFactor;
                obj.y = centerY + (obj.y - centerY) * scaleFactor;
                obj.fontSize *= scaleFactor;
            } else if (obj.constructor.name === 'VectorSVG') {
                obj.x = centerX + (obj.x - centerX) * scaleFactor;
                obj.y = centerY + (obj.y - centerY) * scaleFactor;
                obj.width *= scaleFactor;
                obj.height *= scaleFactor;
            }
            
            // Update bounds
            if (typeof obj.updateBounds === 'function') {
                obj.updateBounds();
            }
        } catch (error) {
            console.warn(`[MULTI-LEVEL] Failed to scale object:`, error);
        }
    }
    
    // Get object bounds for different object types
    getObjectBounds(obj) {
        try {
            if (obj.constructor.name === 'VectorCircle') {
                return {
                    x: obj.x - obj.radius,
                    y: obj.y - obj.radius,
                    width: obj.radius * 2,
                    height: obj.radius * 2
                };
            } else if (obj.constructor.name === 'VectorRectangle') {
                return {
                    x: obj.x,
                    y: obj.y,
                    width: obj.width,
                    height: obj.height
                };
            } else if (obj.constructor.name === 'VectorLine') {
                const minX = Math.min(obj.x1, obj.x2);
                const maxX = Math.max(obj.x1, obj.x2);
                const minY = Math.min(obj.y1, obj.y2);
                const maxY = Math.max(obj.y1, obj.y2);
                return {
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY
                };
            } else if (obj.constructor.name === 'VectorBezier') {
                const minX = Math.min(obj.x1, obj.x2, obj.cp1x, obj.cp2x);
                const maxX = Math.max(obj.x1, obj.x2, obj.cp1x, obj.cp2x);
                const minY = Math.min(obj.y1, obj.y2, obj.cp1y, obj.cp2y);
                const maxY = Math.max(obj.y1, obj.y2, obj.cp1y, obj.cp2y);
                return {
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY
                };
            } else if (obj.constructor.name === 'VectorText') {
                // Estimate text bounds
                const estimatedWidth = obj.text.length * obj.fontSize * 0.6;
                const estimatedHeight = obj.fontSize * 1.2;
                return {
                    x: obj.x,
                    y: obj.y - estimatedHeight,
                    width: estimatedWidth,
                    height: estimatedHeight
                };
            } else if (obj.constructor.name === 'VectorSVG') {
                return {
                    x: obj.x,
                    y: obj.y,
                    width: obj.width,
                    height: obj.height
                };
            }
            
            // Fallback for unknown object types
            return {
                x: obj.x || 0,
                y: obj.y || 0,
                width: obj.width || obj.radius * 2 || 1,
                height: obj.height || obj.radius * 2 || 1
            };
        } catch (error) {
            console.warn(`[MULTI-LEVEL] Failed to get object bounds:`, error);
            return { x: 0, y: 0, width: 1, height: 1 };
        }
    }
    
    // Debug: Draw quadtree visualization for current level
    draw(ctx, zoomLevel, viewport) {
        const currentQuadTree = this.getCurrentQuadTree();
        if (currentQuadTree && typeof currentQuadTree.draw === 'function') {
            currentQuadTree.draw(ctx, zoomLevel, viewport);
        }
    }
    
    // Expand quadtree bounds to accommodate an object
    expandQuadTreeBounds(quadTree, objBounds) {
        const currentBounds = quadTree.boundary;
        
        // Calculate new bounds that encompass both current bounds and object bounds
        const newMinX = Math.min(currentBounds.x, objBounds.x);
        const newMinY = Math.min(currentBounds.y, objBounds.y);
        const newMaxX = Math.max(currentBounds.x + currentBounds.width, objBounds.x + objBounds.width);
        const newMaxY = Math.max(currentBounds.y + currentBounds.height, objBounds.y + objBounds.height);
        
        // Add some padding to avoid frequent expansions
        const padding = Math.max(newMaxX - newMinX, newMaxY - newMinY) * 0.1;
        const expandedBounds = new Rectangle(
            newMinX - padding,
            newMinY - padding,
            (newMaxX - newMinX) + padding * 2,
            (newMaxY - newMinY) + padding * 2
        );
        
        console.log(`[MULTI-LEVEL] Expanding quadtree bounds:`, {
            old: { x: currentBounds.x, y: currentBounds.y, w: currentBounds.width, h: currentBounds.height },
            new: { x: expandedBounds.x, y: expandedBounds.y, w: expandedBounds.width, h: expandedBounds.height }
        });
        
        // Get all existing objects from the quadtree
        const existingObjects = quadTree.getAllObjects();
        
        // Create new quadtree with expanded bounds
        const newQuadTree = new QuadTree(expandedBounds, this.maxObjects, this.maxLevels);
        
        // Re-insert all existing objects
        for (const obj of existingObjects) {
            newQuadTree.insert(obj);
        }
        
        // Replace the old quadtree with the new one
        quadTree.boundary = expandedBounds;
        quadTree.objects = newQuadTree.objects;
        quadTree.nodes = newQuadTree.nodes;
        quadTree.divided = newQuadTree.divided;
        
        console.log(`[MULTI-LEVEL] Quadtree expansion complete`);
    }

    // Estimate memory usage across all levels
    estimateMemoryUsage() {
        let totalMemory = 0;
        for (const [level, quadTree] of this.levelQuadTrees) {
            if (typeof quadTree.estimateMemoryUsage === 'function') {
                totalMemory += quadTree.estimateMemoryUsage();
            } else {
                // Fallback estimation if method doesn't exist
                const objects = quadTree.getAllObjects();
                const nodes = quadTree.getNodeCount();
                totalMemory += objects.length * 200 + nodes * 100; // Rough estimate
            }
        }
        return totalMemory;
    }
} 