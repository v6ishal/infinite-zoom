/**
 * Infinite Zoom Engine
 * Manages viewport, transformations, and rendering orchestration
 */

class InfiniteZoomEngine {
    constructor(canvas, baseBounds) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Use MultiLevelQuadTree instead of single QuadTree
        this.multiLevelQuadTree = new MultiLevelQuadTree(baseBounds, 8, 12);
        
        // Viewport state
        this.viewportX = 0;
        this.viewportY = 0;
        this.zoomLevel = 1;
        this.minZoom = 0.001;
        this.maxZoom = 1000000; // Increased to 1 million times zoom
        
        // Infinite zoom levels
        this.zoomLevelCount = 0; // How many times we've reset the zoom
        this.zoomResetThreshold = 500000; // Reset when reaching 500,000x
        this.zoomResetTarget = 2; // Reset to 2x (so we don't lose precision near 1x)
        this.zoomResetLowerThreshold = 1; // Reset when zooming out below 1x
        this.zoomResetUpperTarget = 250000; // Reset to 250,000x when going back a level
        this.lastResetTime = 0; // Throttle rapid resets
        this.resetCooldown = 100; // Minimum time between resets (ms)
        
        // Smooth zoom/pan animation
        this.targetZoom = 1;
        this.targetX = 0;
        this.targetY = 0;
        this.animationSpeed = 0.15;
        this.isAnimating = false;
        
        // Performance tracking
        this.renderTime = 0;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.fps = 0;
        
        // Input handling
        this.isMouseDown = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.mouseWorldX = 0;
        this.mouseWorldY = 0;
        
        // Rendering optimizations
        this.renderBatch = new RenderBatch();
        this.cullingEnabled = true;
        this.lodEnabled = true;
        this.debugMode = false;
        
        // Callbacks for level reset handling
        this.onScaleObjects = null;
        this.onScaleObjectsRelativeToPoint = null;
        this.onZoomLevelReset = null;
        
        this.setupEventListeners();
        this.resize();
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // Window resize
        window.addEventListener('resize', () => this.resize());
        
        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Reset canvas styles that might be affected by resize
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }
    
    // Convert screen coordinates to world coordinates
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.canvas.width / 2) / this.zoomLevel + this.viewportX,
            y: (screenY - this.canvas.height / 2) / this.zoomLevel + this.viewportY
        };
    }
    
    // Convert world coordinates to screen coordinates
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.viewportX) * this.zoomLevel + this.canvas.width / 2,
            y: (worldY - this.viewportY) * this.zoomLevel + this.canvas.height / 2
        };
    }
    
    // Get current viewport bounds in world coordinates
    getViewportBounds() {
        const halfWidth = this.canvas.width / (2 * this.zoomLevel);
        const halfHeight = this.canvas.height / (2 * this.zoomLevel);
        
        return new Rectangle(
            this.viewportX - halfWidth,
            this.viewportY - halfHeight,
            halfWidth * 2,
            halfHeight * 2
        );
    }
    
    // Set zoom level with optional center point
    setZoom(newZoom, centerX = this.canvas.width / 2, centerY = this.canvas.height / 2) {
        let clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        
        // Check for zoom level reset (infinite zoom) - going UP
        if (clampedZoom >= this.zoomResetThreshold) {
            this.performZoomLevelReset(centerX, centerY, 'up');
            return;
        }
        
        // Check for zoom level reset (infinite zoom) - going DOWN
        if (clampedZoom <= this.zoomResetLowerThreshold && this.zoomLevelCount > 0) {
            this.performZoomLevelReset(centerX, centerY, 'down');
            return;
        }
        
        if (Math.abs(this.zoomLevel - clampedZoom) < 0.01) {
            return;
        }
        
        // Calculate target viewport position
        const worldPos = this.screenToWorld(centerX, centerY);
        this.targetZoom = clampedZoom;
        
        // Calculate where viewport should be to keep center point stable
        const targetScreenPos = this.worldToScreen(worldPos.x, worldPos.y);
        const deltaX = (centerX - targetScreenPos.x) / clampedZoom;
        const deltaY = (centerY - targetScreenPos.y) / clampedZoom;
        
        this.targetX = this.viewportX + deltaX;
        this.targetY = this.viewportY + deltaY;
        
        this.isAnimating = true;
    }
    
    // Pan viewport
    pan(deltaX, deltaY) {
        this.viewportX += deltaX / this.zoomLevel;
        this.viewportY += deltaY / this.zoomLevel;
        
        this.targetX = this.viewportX;
        this.targetY = this.viewportY;
    }
    
    // Mouse event handlers
    onMouseDown(e) {
        this.isMouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        
        const worldPos = this.screenToWorld(e.clientX, e.clientY);
        this.mouseWorldX = worldPos.x;
        this.mouseWorldY = worldPos.y;
    }
    
    onMouseMove(e) {
        if (this.isMouseDown) {
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;
            
            this.pan(deltaX, deltaY);
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        }
        
        const worldPos = this.screenToWorld(e.clientX, e.clientY);
        this.mouseWorldX = worldPos.x;
        this.mouseWorldY = worldPos.y;
    }
    
    onMouseUp(e) {
        this.isMouseDown = false;
    }
    
    onWheel(e) {
        e.preventDefault();
        
        const zoomFactor = 1.1;
        const newZoom = e.deltaY > 0 ? this.zoomLevel / zoomFactor : this.zoomLevel * zoomFactor;
        
        this.zoomTo(newZoom, e.clientX, e.clientY);
    }
    
    // Touch event handlers
    onTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }
    
    onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }
    
    onTouchEnd(e) {
        e.preventDefault();
        this.onMouseUp(e);
    }
    
    // Keyboard shortcuts
    onKeyDown(e) {
        switch (e.key) {
            case '=':
            case '+':
                this.zoomTo(this.zoomLevel * 1.5);
                break;
            case '-':
                this.zoomTo(this.zoomLevel / 1.5);
                break;
            case '0':
                this.resetView();
                break;
            case 'ArrowUp':
                this.pan(0, -50);
                break;
            case 'ArrowDown':
                this.pan(0, 50);
                break;
            case 'ArrowLeft':
                this.pan(-50, 0);
                break;
            case 'ArrowRight':
                this.pan(50, 0);
                break;
        }
    }
    
    // Reset view to initial state
    resetView() {
        // If we had zoom level resets, we need to scale all objects back to original size
        if (this.zoomLevelCount > 0) {
            const resetScaleFactor = Math.pow(this.zoomResetTarget / this.zoomResetThreshold, this.zoomLevelCount);
            this.scaleAllObjects(resetScaleFactor);
        }
        
        this.targetZoom = 1;
        this.targetX = 0;
        this.targetY = 0;
        this.zoomLevelCount = 0; // Reset zoom level count
        this.isAnimating = true;
    }
    
    // Get the current quadtree (for backwards compatibility)
    get quadTree() {
        return this.multiLevelQuadTree.getCurrentQuadTree();
    }
    
    // Set quadtree reference (for backwards compatibility)
    set quadTree(value) {
        // This is mainly for backwards compatibility with existing code
        console.warn('[ZOOM ENGINE] Setting quadTree directly is deprecated. Use multiLevelQuadTree instead.');
    }

    // Get the effective total zoom level (accounting for zoom level resets)
    getEffectiveZoom() {
        if (this.zoomLevelCount === 0) {
            return this.zoomLevel;
        }
        
        // Prevent overflow by capping the calculation
        const maxLevelCount = 50; // Prevent extreme values
        const cappedLevelCount = Math.min(Math.abs(this.zoomLevelCount), maxLevelCount);
        
        try {
            const multiplier = Math.pow(this.zoomResetThreshold / this.zoomResetTarget, cappedLevelCount);
            const effectiveZoom = this.zoomLevel * multiplier;
            
            // Check for overflow
            if (!isFinite(effectiveZoom) || effectiveZoom > Number.MAX_SAFE_INTEGER) {
                return Number.MAX_SAFE_INTEGER;
            }
            
            return effectiveZoom;
        } catch (error) {
            console.warn('Error calculating effective zoom:', error);
            return this.zoomLevel;
        }
    }

    // Smooth zoom animation
    zoomTo(targetZoom, centerX = this.canvas.width / 2, centerY = this.canvas.height / 2) {
        let clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, targetZoom));
        
        // Check for zoom level reset (infinite zoom) - going UP
        if (clampedZoom >= this.zoomResetThreshold) {
            this.performZoomLevelReset(centerX, centerY, 'up');
            return;
        }
        
        // Check for zoom level reset (infinite zoom) - going DOWN
        if (clampedZoom <= this.zoomResetLowerThreshold && this.zoomLevelCount > 0) {
            this.performZoomLevelReset(centerX, centerY, 'down');
            return;
        }
        
        // Calculate world position at center point
        const worldPos = this.screenToWorld(centerX, centerY);
        
        // Set animation targets
        this.targetZoom = clampedZoom;
        
        // Calculate target viewport position to keep center point stable
        const targetScreenPos = this.worldToScreen(worldPos.x, worldPos.y);
        const deltaX = (centerX - targetScreenPos.x) / this.targetZoom;
        const deltaY = (centerY - targetScreenPos.y) / this.targetZoom;
        
        this.targetX = this.viewportX + deltaX;
        this.targetY = this.viewportY + deltaY;
        
        this.isAnimating = true;
    }
    
    // Perform zoom level reset for infinite zoom
    performZoomLevelReset(centerX, centerY, direction = 'up') {
        // Throttle rapid resets
        const now = performance.now();
        if (now - this.lastResetTime < this.resetCooldown) {
            console.log(`[ZOOM RESET] Throttled - too soon after last reset`);
            return;
        }
        this.lastResetTime = now;
        
        // Prevent excessive zoom levels
        if (Math.abs(this.zoomLevelCount) > 100) {
            console.warn(`[ZOOM RESET] Prevented excessive zoom level: ${this.zoomLevelCount}`);
            return;
        }
        
        // Get the current viewport center in world coordinates
        const viewportCenter = this.screenToWorld(this.canvas.width / 2, this.canvas.height / 2);
        
        let scaleFactor, newZoomLevel, newLevelCount;
        
        console.log(`[ZOOM RESET] Direction: ${direction}, Current zoom: ${this.zoomLevel}, Level: ${this.zoomLevelCount}`);
        console.log(`[ZOOM RESET] Viewport center: (${viewportCenter.x.toFixed(2)}, ${viewportCenter.y.toFixed(2)})`);
        
        if (direction === 'up') {
            // Zooming in past upper threshold
            scaleFactor = this.zoomLevel / this.zoomResetTarget;
            newZoomLevel = this.zoomResetTarget;
            newLevelCount = this.zoomLevelCount + 1;
            console.log(`[ZOOM UP] Scale factor: ${scaleFactor}, New zoom: ${newZoomLevel}, New level: ${newLevelCount}`);
        } else {
            // Zooming out past lower threshold
            // Use the inverse of the upward scale factor to restore original sizes
            const upwardScaleFactor = this.zoomResetThreshold / this.zoomResetTarget; // What was used to go up
            scaleFactor = 1.0 / upwardScaleFactor; // Inverse to go back down
            newZoomLevel = this.zoomResetUpperTarget;
            newLevelCount = this.zoomLevelCount - 1;
            console.log(`[ZOOM DOWN] Upward scale was: ${upwardScaleFactor.toFixed(6)}, Downward scale factor: ${scaleFactor.toFixed(6)}, New zoom: ${newZoomLevel}, New level: ${newLevelCount}`);
        }
        
        // Transfer objects to new level with scaling
        console.log(`[ZOOM RESET] Transferring objects from level ${this.zoomLevelCount} to level ${newLevelCount}`);
        this.multiLevelQuadTree.transferObjectsToLevel(
            this.zoomLevelCount,
            newLevelCount,
            scaleFactor,
            viewportCenter.x,
            viewportCenter.y
        );
        
        // Update zoom engine state
        this.zoomLevelCount = newLevelCount;
        this.zoomLevel = newZoomLevel;
        this.targetZoom = newZoomLevel;
        
        // CRITICAL: Update viewport position to account for new zoom level
        // The viewport position needs to be scaled relative to the same center point
        this.viewportX = viewportCenter.x + (this.viewportX - viewportCenter.x) * scaleFactor;
        this.viewportY = viewportCenter.y + (this.viewportY - viewportCenter.y) * scaleFactor;
        this.targetX = this.viewportX;
        this.targetY = this.viewportY;
        
        console.log(`[ZOOM RESET] Updated viewport position to (${this.viewportX.toFixed(2)}, ${this.viewportY.toFixed(2)})`);
        
        // Switch to the new level
        this.multiLevelQuadTree.setCurrentLevel(newLevelCount);
        
        // Get statistics
        const stats = this.multiLevelQuadTree.getLevelStats();
        console.log(`[ZOOM RESET] Level statistics:`, stats);
        
        // Calculate effective zoom
        const effectiveZoom = this.getEffectiveZoom();
        console.log(`[ZOOM RESET] Reset complete! Level: ${this.zoomLevelCount}, Effective zoom: ${effectiveZoom.toExponential(2)}`);
        
        // Call callback if provided
        if (this.onZoomLevelReset) {
            this.onZoomLevelReset(this.zoomLevelCount, effectiveZoom, direction);
        }
    }

    // Scale all objects in the scene
    scaleAllObjects(scaleFactor) {
        // This method should be called by the application to scale all vector objects
        // We'll add an event callback for this
        if (this.onScaleObjects) {
            this.onScaleObjects(scaleFactor);
        }
    }

    // Scale all objects relative to a center point
    scaleAllObjectsRelativeToPoint(scaleFactor, centerX, centerY) {
        // This method should be called by the application to scale all vector objects
        // relative to a specific point
        if (this.onScaleObjectsRelativeToPoint) {
            this.onScaleObjectsRelativeToPoint(scaleFactor, centerX, centerY);
        }
    }
    
    // Animation update
    updateAnimation() {
        if (!this.isAnimating) return;
        
        const zoomDiff = this.targetZoom - this.zoomLevel;
        const xDiff = this.targetX - this.viewportX;
        const yDiff = this.targetY - this.viewportY;
        
        // Apply smooth interpolation
        this.zoomLevel += zoomDiff * this.animationSpeed;
        this.viewportX += xDiff * this.animationSpeed;
        this.viewportY += yDiff * this.animationSpeed;
        
        // Check if animation is complete
        if (Math.abs(zoomDiff) < 0.01 && Math.abs(xDiff) < 0.1 && Math.abs(yDiff) < 0.1) {
            this.zoomLevel = this.targetZoom;
            this.viewportX = this.targetX;
            this.viewportY = this.targetY;
            this.isAnimating = false;
        }
    }
    
    // Main render loop
    render() {
        const startTime = performance.now();
        
        // Update animation
        this.updateAnimation();
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Setup transformation matrix
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        this.ctx.translate(-this.viewportX, -this.viewportY);
        
        // Query visible objects from current level's quadtree
        const viewport = this.getViewportBounds();
        let visibleObjects;
        
        if (this.lodEnabled) {
            visibleObjects = this.multiLevelQuadTree.queryLOD(viewport, this.zoomLevel);
        } else {
            visibleObjects = this.multiLevelQuadTree.query(viewport);
        }
        
        // Debug rendering at different zoom levels
        if (this.frameCount % 60 === 0) { // Log every 60 frames to avoid spam
            console.log(`[RENDER] Level ${this.zoomLevelCount}, Zoom: ${this.zoomLevel.toFixed(2)}x`);
            console.log(`[RENDER] Viewport bounds:`, {
                x: viewport.x.toFixed(2),
                y: viewport.y.toFixed(2),
                width: viewport.width.toFixed(2),
                height: viewport.height.toFixed(2)
            });
            console.log(`[RENDER] Total objects in level: ${this.multiLevelQuadTree.getAllObjects().length}`);
            console.log(`[RENDER] Visible objects: ${visibleObjects.length}`);
            
            if (visibleObjects.length > 0) {
                const firstObj = visibleObjects[0];
                console.log(`[RENDER] First visible object:`, {
                    type: firstObj.constructor.name,
                    x: firstObj.x || firstObj.x1,
                    y: firstObj.y || firstObj.y1,
                    size: firstObj.radius || firstObj.width || 'line'
                });
            }
        }
        
        // Render visible objects
        this.renderBatch.clear();
        for (const obj of visibleObjects) {
            this.renderBatch.addObject(obj);
        }
        
        this.renderBatch.render(this.ctx, this.zoomLevel);
        
        // Draw quadtree visualization if enabled
        if (this.debugMode) {
            this.multiLevelQuadTree.draw(this.ctx, this.zoomLevel, viewport);
        }
        
        this.ctx.restore();
        
        // Draw UI overlay
        this.drawUI();
        
        // Performance tracking
        this.renderTime = performance.now() - startTime;
        this.frameCount++;
        
        // Calculate FPS
        const now = performance.now();
        if (now - this.lastFrameTime > 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = now;
        }
        
        // Continue animation loop
        requestAnimationFrame(() => this.render());
    }
    
    // Draw UI overlay
    drawUI() {
        // Save context state
        this.ctx.save();
        
        // Reset transform for UI
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // UI styling
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        
        // Performance info
        const visibleObjects = this.multiLevelQuadTree.getAllObjects().length;
        const stats = this.multiLevelQuadTree.getLevelStats();
        const effectiveZoom = this.getEffectiveZoom();
        
        let y = 20;
        this.ctx.fillText(`FPS: ${this.fps}`, 10, y);
        y += 15;
        this.ctx.fillText(`Render: ${this.renderTime.toFixed(1)}ms`, 10, y);
        y += 15;
        this.ctx.fillText(`Zoom: ${this.zoomLevel.toFixed(2)}x (L${this.zoomLevelCount})`, 10, y);
        y += 15;
        this.ctx.fillText(`Effective: ${effectiveZoom.toExponential(2)}x`, 10, y);
        y += 15;
        this.ctx.fillText(`Visible: ${visibleObjects}`, 10, y);
        y += 15;
        this.ctx.fillText(`Levels: ${stats.totalLevels}`, 10, y);
        y += 15;
        this.ctx.fillText(`Nodes: ${this.multiLevelQuadTree.getNodeCount()}`, 10, y);
        
        // Draw level statistics
        y += 20;
        this.ctx.fillText(`Level Details:`, 10, y);
        y += 15;
        
        for (const levelInfo of stats.levels) {
            const marker = levelInfo.isCurrent ? '→' : ' ';
            this.ctx.fillText(
                `${marker} L${levelInfo.level}: ${levelInfo.objectCount} objects, ${levelInfo.nodeCount} nodes`,
                10, y
            );
            y += 15;
        }
        
        // Restore context state
        this.ctx.restore();
    }
    
    // Get performance statistics
    getStats() {
        const visibleObjects = this.multiLevelQuadTree.queryLOD(this.getViewportBounds(), this.zoomLevel);
        const totalObjects = this.multiLevelQuadTree.getAllObjects();
        const memoryUsage = this.multiLevelQuadTree.estimateMemoryUsage();
        
        return {
            zoomLevel: this.zoomLevel,
            effectiveZoom: this.getEffectiveZoom(),
            zoomLevelCount: this.zoomLevelCount,
            isInfiniteZoom: this.zoomLevelCount > 0,
            visibleObjects: visibleObjects.length,
            totalObjects: totalObjects.length,
            quadNodes: this.multiLevelQuadTree.getNodeCount(),
            renderTime: this.renderTime,
            memoryUsage: Math.round(memoryUsage / 1024), // KB
            fps: this.fps,
            viewportX: this.viewportX,
            viewportY: this.viewportY,
            mouseWorldX: this.mouseWorldX,
            mouseWorldY: this.mouseWorldY
        };
    }
    
    // Add object to the scene
    addObject(obj) {
        this.multiLevelQuadTree.insert(obj);
    }
    
    // Clear all objects
    clearAll() {
        this.multiLevelQuadTree.clear();
    }
    
    // Toggle debug mode
    toggleDebug() {
        this.debugMode = !this.debugMode;
    }
    
    // Toggle level of detail
    toggleLOD() {
        this.lodEnabled = !this.lodEnabled;
    }
    
    // Toggle culling
    toggleCulling() {
        this.cullingEnabled = !this.cullingEnabled;
    }
    
    // Rebuild quadtree (useful after bulk operations)
    rebuildQuadTree() {
        this.multiLevelQuadTree.rebuild();
    }
    
    // Find objects at a specific point
    getObjectsAtPoint(worldX, worldY, radius = 5) {
        const searchArea = new Rectangle(
            worldX - radius,
            worldY - radius,
            radius * 2,
            radius * 2
        );
        
        return this.multiLevelQuadTree.query(searchArea);
    }
    
    // Get objects in a selection rectangle
    getObjectsInRect(x1, y1, x2, y2) {
        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        const maxX = Math.max(x1, x2);
        const maxY = Math.max(y1, y2);
        
        const selectionRect = new Rectangle(minX, minY, maxX - minX, maxY - minY);
        return this.multiLevelQuadTree.query(selectionRect);
    }
} 