/**
 * Main Application
 * Initializes the infinite zoom vector graphics system
 */

// Global variables
let engine;
let currentTool = 'pan';
let isDrawing = false;
let drawingStart = null;
let tempShape = null;
let showQuadTreeDebug = false;
let showStats = true;

// SVG-related variables
let currentSVGContent = null;
let svgPreviewIndicator = null; // Preview indicator when in SVG mode

// Initialize the infinite zoom application
function initializeApp() {
    console.log('Initializing Infinite Zoom Application...');
    
    // Canvas setup
    const canvas = document.getElementById('zoomCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    // Create world bounds for the multi-level quadtree system
    const worldBounds = new Rectangle(-10000, -10000, 20000, 20000);
    
    // Initialize the zoom engine with multi-level quadtree
    engine = new InfiniteZoomEngine(canvas, worldBounds);
    
    // Set up zoom level reset handlers
    setupInfiniteZoomHandlers();
    
    // Initialize UI
    initializeUI();
    
    // Set up drawing tools
    setupDrawingTools();
    
    // Setup SVG support
    setupSVGSupport();
    
    // Start the render loop
    engine.render();
    
    console.log('✅ Infinite Zoom Application initialized successfully!');
}

// Initialize UI elements
function initializeUI() {
    // Start stats update loop
    setInterval(updatePerformanceStats, 100);
    
    // Initialize controls
    setTool('line');
    
    // Generate some initial shapes
    generateInitialShapes();
}

// Set up drawing tools
function setupDrawingTools() {
    setupDrawingEvents();
}

// Set up SVG support
function setupSVGSupport() {
    setupSVGDragDrop();
}

// Setup infinite zoom level reset handlers
function setupInfiniteZoomHandlers() {
    // Handle zoom level reset notifications
    engine.onZoomLevelReset = (levelCount, effectiveZoom, direction) => {
        console.log(`Zoom level reset! Level: ${levelCount}, Effective zoom: ${effectiveZoom.toExponential(2)}x, Direction: ${direction}`);
        
        // Visual feedback for zoom level changes
        showZoomResetNotification(levelCount, effectiveZoom, direction);
    };
}

// Add object to scene (handled by multi-level quadtree system)
function addObjectToScene(obj) {
    console.log(`Adding ${obj.constructor.name} to scene`);
    engine.addObject(obj);
    
    // Update performance stats
    updatePerformanceStats();
}

// Clear all objects from scene
function clearAll() {
    console.log('Clearing all objects from scene...');
    engine.clearAll();
    
    // Clear the SVG preview indicator
    if (svgPreviewIndicator) {
        svgPreviewIndicator = null;
    }
    
    // Reset level to 0
    engine.zoomLevelCount = 0;
    engine.multiLevelQuadTree.setCurrentLevel(0);
    
    updatePerformanceStats();
    console.log('✅ All objects cleared');
}

// Update performance statistics display
function updatePerformanceStats() {
    const stats = engine.getStats();
    const levelStats = engine.multiLevelQuadTree.getLevelStats();
    
    document.getElementById('zoomLevel').textContent = 
        `${stats.zoomLevel.toFixed(2)}x (L${stats.zoomLevelCount})`;
    document.getElementById('effectiveZoom').textContent = 
        `${stats.effectiveZoom.toExponential(2)}x`;
    document.getElementById('visibleObjects').textContent = stats.visibleObjects;
    document.getElementById('totalObjects').textContent = stats.totalObjects;
    document.getElementById('quadNodes').textContent = stats.quadNodes;
    document.getElementById('totalLevels').textContent = levelStats.totalLevels;
    document.getElementById('renderTime').textContent = `${stats.renderTime.toFixed(1)}ms`;
    document.getElementById('memoryUsage').textContent = `${stats.memoryUsage}KB`;
}

// Show a visual notification for zoom level reset
function showZoomResetNotification(levelCount, effectiveZoom, direction = 'up') {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '50%';
    notification.style.left = '50%';
    notification.style.transform = 'translate(-50%, -50%)';
    notification.style.background = 'rgba(0, 0, 0, 0.8)';
    notification.style.color = 'white';
    notification.style.padding = '20px';
    notification.style.borderRadius = '10px';
    notification.style.fontSize = '18px';
    notification.style.textAlign = 'center';
    notification.style.zIndex = '1000';
    notification.style.animation = 'fadeInOut 2s ease-in-out';
    
    // Different messages and icons based on direction
    let icon, message;
    if (direction === 'up') {
        icon = '🔄⬆️';
        message = 'Zoom Level Up!';
    } else {
        icon = '🔄⬇️';
        message = 'Zoom Level Down!';
    }
    
    notification.innerHTML = `
        <div>${icon} ${message}</div>
        <div>Level: ${levelCount}</div>
        <div>Effective: ${effectiveZoom.toExponential(2)}x</div>
    `;
    
    // Add CSS animation if not already present
    if (!document.getElementById('zoom-reset-animation')) {
        const style = document.createElement('style');
        style.id = 'zoom-reset-animation';
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove notification after animation
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 2000);
}

// Setup drawing-specific event listeners
function setupDrawingEvents() {
    const canvas = document.getElementById('zoomCanvas');
    canvas.addEventListener('mousedown', onDrawingMouseDown);
    canvas.addEventListener('mousemove', onDrawingMouseMove);
    canvas.addEventListener('mouseup', onDrawingMouseUp);
    canvas.addEventListener('mouseleave', onCanvasMouseLeave);
    
    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function onCanvasMouseLeave() {
    // End any active drawing when mouse leaves canvas
    if (isDrawing) {
        isDrawing = false;
        drawingStart = null;
        tempShape = null;
    }
}

// Drawing event handlers
function onDrawingMouseDown(e) {
    if (currentTool === 'pan') return;
    
    const worldPos = engine.screenToWorld(e.clientX, e.clientY);
    
    // Debug drawing at different zoom levels
    console.log(`[DRAWING] Mouse down at screen (${e.clientX}, ${e.clientY}) -> world (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)})`);
    console.log(`[DRAWING] Current zoom level: ${engine.zoomLevel}x (L${engine.zoomLevelCount})`);
    console.log(`[DRAWING] Viewport: (${engine.viewportX.toFixed(2)}, ${engine.viewportY.toFixed(2)})`);
    
    // Handle SVG placement - now works like rectangle drawing
    if (currentTool === 'svg' && currentSVGContent) {
        // Start SVG placement like rectangle drawing
        drawingStart = worldPos;
        isDrawing = true;
        
        // Create temporary SVG with minimal size
        tempShape = new VectorSVG(worldPos.x, worldPos.y, 1, 1, currentSVGContent);
        engine.addObject(tempShape);
        return;
    }
    
    drawingStart = worldPos;
    isDrawing = true;
    
    // Create temporary shape based on current tool
    switch (currentTool) {
        case 'circle':
            tempShape = new VectorCircle(worldPos.x, worldPos.y, 1);
            break;
        case 'rectangle':
            tempShape = new VectorRectangle(worldPos.x, worldPos.y, 1, 1);
            break;
        case 'line':
            tempShape = new VectorLine(worldPos.x, worldPos.y, worldPos.x, worldPos.y);
            break;
        case 'bezier':
            // For bezier, we'll create it with control points initially at start
            tempShape = new VectorBezier(
                worldPos.x, worldPos.y,
                worldPos.x, worldPos.y,
                worldPos.x, worldPos.y,
                worldPos.x, worldPos.y
            );
            break;
    }
    
    if (tempShape) {
        console.log(`[DRAWING] Created ${tempShape.constructor.name} at (${tempShape.x || tempShape.x1}, ${tempShape.y || tempShape.y1})`);
        engine.addObject(tempShape);
    }
}

function onDrawingMouseMove(e) {
    const worldPos = engine.screenToWorld(e.clientX, e.clientY);
    
    if (!isDrawing || !tempShape || currentTool === 'pan') return;
    
    // Update temporary shape based on current tool
    switch (currentTool) {
        case 'circle':
            const radius = Math.sqrt(
                Math.pow(worldPos.x - drawingStart.x, 2) +
                Math.pow(worldPos.y - drawingStart.y, 2)
            );
            tempShape.radius = radius;
            break;
            
        case 'rectangle':
            tempShape.width = worldPos.x - drawingStart.x;
            tempShape.height = worldPos.y - drawingStart.y;
            break;
            
        case 'svg':
            // Update SVG size like rectangle
            tempShape.width = Math.abs(worldPos.x - drawingStart.x);
            tempShape.height = Math.abs(worldPos.y - drawingStart.y);
            
            // Adjust position if dragging in negative direction
            if (worldPos.x < drawingStart.x) {
                tempShape.x = worldPos.x;
            }
            if (worldPos.y < drawingStart.y) {
                tempShape.y = worldPos.y;
            }
            break;
            
        case 'line':
            tempShape.x2 = worldPos.x;
            tempShape.y2 = worldPos.y;
            break;
            
        case 'bezier':
            // Update end point and control points
            tempShape.x2 = worldPos.x;
            tempShape.y2 = worldPos.y;
            
            // Set control points to create a smooth curve
            const midX = (drawingStart.x + worldPos.x) / 2;
            const midY = (drawingStart.y + worldPos.y) / 2;
            const offset = 50;
            
            tempShape.cp1x = midX - offset;
            tempShape.cp1y = midY - offset;
            tempShape.cp2x = midX + offset;
            tempShape.cp2y = midY + offset;
            break;
    }
    
    // Rebuild quadtree to update object positions
    engine.rebuildQuadTree();
}

function onDrawingMouseUp(e) {
    if (!isDrawing || currentTool === 'pan') return;
    
    // For SVG, ensure minimum size
    if (currentTool === 'svg' && tempShape) {
        const minSize = 0.00001; // Minimum SVG size
        if (tempShape.width < minSize) tempShape.width = minSize;
        if (tempShape.height < minSize) tempShape.height = minSize;
        
        console.log(`[DRAWING] Completed SVG placement: ${tempShape.width.toFixed(2)} x ${tempShape.height.toFixed(2)} at (${tempShape.x.toFixed(2)}, ${tempShape.y.toFixed(2)})`);
    }
    
    isDrawing = false;
    drawingStart = null;
    tempShape = null;
    
    // Rebuild quadtree after drawing is complete
    engine.rebuildQuadTree();
}

// SVG Loading and Placement Functions
async function loadSVGFile(input) {
    const file = input.files[0];
    if (!file) return;
    
    try {
        const svgContent = await SVGLoader.loadFromFile(file);
        currentSVGContent = svgContent;
        updateSVGStatus(`Loaded: ${file.name}`);
        setTool('svg');
    } catch (error) {
        console.error('Error loading SVG:', error);
        updateSVGStatus(`Error: ${error.message}`);
    }
}

async function loadSampleSVG() {
    const sampleSVG = `
        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#4ecdc4;stop-opacity:1" />
                </linearGradient>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
                </filter>
            </defs>
            
            <!-- Background circle -->
            <circle cx="100" cy="100" r="80" fill="url(#grad1)" filter="url(#shadow)"/>
            
            <!-- Inner shapes -->
            <polygon points="100,40 140,80 140,120 100,160 60,120 60,80" fill="#fff" opacity="0.8"/>
            <circle cx="100" cy="100" r="30" fill="#333"/>
            
            <!-- Text -->
            <text x="100" y="105" text-anchor="middle" fill="#fff" font-size="14" font-family="Arial">ZOOM</text>
            
            <!-- Decorative elements -->
            <circle cx="70" cy="70" r="5" fill="#fff" opacity="0.6"/>
            <circle cx="130" cy="70" r="5" fill="#fff" opacity="0.6"/>
            <circle cx="70" cy="130" r="5" fill="#fff" opacity="0.6"/>
            <circle cx="130" cy="130" r="5" fill="#fff" opacity="0.6"/>
        </svg>
    `;
    
    currentSVGContent = sampleSVG;
    updateSVGStatus('Sample SVG loaded');
    setTool('svg');
}

function updateSVGStatus(message) {
    document.getElementById('svgStatus').textContent = message;
}

function setupSVGDragDrop() {
    const canvas = document.getElementById('zoomCanvas');
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        canvas.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Highlight drop area
    ['dragenter', 'dragover'].forEach(eventName => {
        canvas.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        canvas.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight(e) {
        canvas.style.border = '3px dashed #4ecdc4';
    }
    
    function unhighlight(e) {
        canvas.style.border = 'none';
    }
    
    // Handle dropped files
    canvas.addEventListener('drop', handleDrop, false);
    
    async function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            if (file.type.includes('svg')) {
                try {
                    const svgContent = await SVGLoader.loadFromFile(file);
                    currentSVGContent = svgContent;
                    updateSVGStatus(`Loaded: ${file.name}`);
                    setTool('svg');
                    
                    // Auto-place SVG at drop location with viewport-aware sizing
                    const worldPos = engine.screenToWorld(e.clientX, e.clientY);
                    placeSVGAtPosition(worldPos.x, worldPos.y);
                } catch (error) {
                    console.error('Error loading dropped SVG:', error);
                    updateSVGStatus(`Error: ${error.message}`);
                }
            }
        }
    }
}

function calculateViewportAwareSVGSize() {
    const viewport = engine.getViewportBounds();
    const currentZoom = engine.zoomLevel;
    
    // Make SVG take up about 20% of the current viewport width
    let targetSize = viewport.width * 0.2;
    
    // Apply zoom-based constraints for better UX
    if (currentZoom > 10) {
        // When zoomed in a lot, make it smaller relative to zoom
        targetSize = Math.min(targetSize, 200 / currentZoom);
    } else if (currentZoom < 1) {
        // When zoomed out, ensure minimum readable size
        targetSize = Math.max(targetSize, 50);
    }
    
    // Ensure reasonable bounds (between 10 and 500 world units)
    return Math.max(10, Math.min(500, targetSize));
}

function updateSVGPreview(x, y) {
    // Remove existing preview
    if (svgPreviewIndicator) {
        // Remove preview from current level
        const allObjects = engine.multiLevelQuadTree.getAllObjects();
        const index = allObjects.indexOf(svgPreviewIndicator);
        if (index > -1) {
            engine.multiLevelQuadTree.clear();
            allObjects.splice(index, 1);
            for (const obj of allObjects) {
                engine.multiLevelQuadTree.insert(obj);
            }
        }
    }
    
    // Create new preview indicator (using a group for circle + text)
    const previewSize = calculateViewportAwareSVGSize();
    svgPreviewIndicator = new VectorGroup();
    
    // Preview circle
    const previewCircle = new VectorCircle(x, y, previewSize / 2);
    previewCircle.strokeColor = '#4ecdc4';
    previewCircle.fillColor = 'rgba(78, 205, 196, 0.1)';
    previewCircle.strokeWidth = 2;
    previewCircle.opacity = 0.7;
    
    // Size text
    const sizeText = new VectorText(x, y, `${previewSize.toFixed(0)}`, Math.max(8, previewSize / 8));
    sizeText.fillColor = '#4ecdc4';
    sizeText.strokeColor = '#4ecdc4';
    sizeText.opacity = 0.8;
    
    svgPreviewIndicator.addObject(previewCircle);
    svgPreviewIndicator.addObject(sizeText);
    
    // Add preview to engine (temporarily)
    engine.addObject(svgPreviewIndicator);
}

function clearSVGPreview() {
    if (svgPreviewIndicator) {
        // Remove preview from current level
        const allObjects = engine.multiLevelQuadTree.getAllObjects();
        const index = allObjects.indexOf(svgPreviewIndicator);
        if (index > -1) {
            engine.multiLevelQuadTree.clear();
            allObjects.splice(index, 1);
            for (const obj of allObjects) {
                engine.multiLevelQuadTree.insert(obj);
            }
        }
        svgPreviewIndicator = null;
    }
}

function placeSVGAtPosition(x, y) {
    if (!currentSVGContent) {
        updateSVGStatus('No SVG loaded');
        return;
    }
    
    try {
        // Clear any preview indicator
        clearSVGPreview();
        
        const targetSize = calculateViewportAwareSVGSize();
        
        const svgObject = SVGLoader.createSVGObject(
            currentSVGContent,
            x - targetSize / 2,
            y - targetSize / 2,
            targetSize,
            targetSize
        );
        
        engine.addObject(svgObject);
        engine.rebuildQuadTree();
        
        console.log(`SVG placed at: (${x.toFixed(1)}, ${y.toFixed(1)}) with size: ${targetSize.toFixed(1)} at zoom: ${engine.zoomLevel.toFixed(2)}x`);
        updateSVGStatus(`Placed SVG (size: ${targetSize.toFixed(1)})`);
    } catch (error) {
        console.error('Error placing SVG:', error);
        updateSVGStatus(`Error placing SVG: ${error.message}`);
    }
}

// UI Control Functions
function setTool(tool) {
    // Clear SVG preview when switching tools
    if (currentTool === 'svg' && tool !== 'svg') {
        clearSVGPreview();
    }
    
    currentTool = tool;
    
    // Get canvas element
    const canvas = document.getElementById('zoomCanvas');
    if (!canvas) return;
    
    // Update cursor based on tool
    switch (tool) {
        case 'pan':
            canvas.style.cursor = 'grab';
            break;
        case 'line':
        case 'circle':
        case 'rectangle':
        case 'bezier':
            canvas.style.cursor = 'crosshair';
            break;
        case 'svg':
            canvas.style.cursor = currentSVGContent ? 'crosshair' : 'not-allowed';
            if (currentSVGContent && engine) {
                updateSVGStatus(`Ready to draw SVG - click and drag to set size and position`);
            } else {
                updateSVGStatus('No SVG loaded - use "Load SVG" or "Sample SVG" first');
            }
            break;
    }
    
    // Update button states
    document.querySelectorAll('button').forEach(btn => {
        btn.style.backgroundColor = '#4CAF50';
    });
    
    // This is a simple way to highlight the active tool
    // In a real app, you'd want proper button state management
}

function zoomIn() {
    engine.zoomTo(engine.zoomLevel * 1.5);
}

function zoomOut() {
    engine.zoomTo(engine.zoomLevel / 1.5);
}

function resetView() {
    engine.resetView();
}

function toggleQuadTree() {
    showQuadTreeDebug = !showQuadTreeDebug;
    engine.debugMode = showQuadTreeDebug;
}

function toggleStats() {
    showStats = !showStats;
    const statsElement = document.getElementById('info');
    statsElement.style.display = showStats ? 'block' : 'none';
}

function generateRandomShapes() {
    const viewport = engine.getViewportBounds();
    const numShapes = 100;
    
    for (let i = 0; i < numShapes; i++) {
        const shape = createRandomShape(viewport);
        addObjectToScene(shape);
    }
}

// Create a random shape within the given bounds
function createRandomShape(bounds) {
    const shapeTypes = ['circle', 'rectangle', 'line', 'bezier'];
    const type = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
    
    const x = bounds.x + Math.random() * bounds.width;
    const y = bounds.y + Math.random() * bounds.height;
    const size = 10 + Math.random() * 50;
    
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    let shape;
    
    switch (type) {
        case 'circle':
            shape = new VectorCircle(x, y, size);
            break;
        case 'rectangle':
            shape = new VectorRectangle(x, y, size, size);
            break;
        case 'line':
            shape = new VectorLine(x, y, x + size, y + size);
            break;
        case 'bezier':
            shape = new VectorBezier(
                x, y,
                x + size, y + size,
                x + size / 2, y - size / 2,
                x - size / 2, y + size / 2
            );
            break;
    }
    
    if (shape) {
        shape.strokeColor = color;
        shape.fillColor = color + '20'; // Add transparency
    }
    
    return shape;
}

function clearCanvas() {
    engine.clearAll();
}

// Generate some initial shapes for demonstration
function generateInitialShapes() {
    const shapes = [
        // Create a simple scene
        new VectorCircle(0, 0, 50),
        new VectorRectangle(-100, -100, 200, 200),
        new VectorLine(-150, 0, 150, 0),
        new VectorLine(0, -150, 0, 150),
        new VectorBezier(-100, -50, -50, -100, 50, 100, 100, 50),
        new VectorText(-50, -200, 'Infinite Zoom Demo', 24)
    ];
    
    // Add some random shapes around the scene
    for (let i = 0; i < 50; i++) {
        const bounds = new Rectangle(-500, -500, 1000, 1000);
        shapes.push(createRandomShape(bounds));
    }
    
    // Add shapes to scene
    for (const shape of shapes) {
        addObjectToScene(shape);
    }
    
    // Add a fractal-like pattern for infinite zoom testing
    generateFractalPattern(0, 0, 300, 0);
}

// Generate a fractal pattern for testing infinite zoom
function generateFractalPattern(x, y, size, depth) {
    if (depth > 6 || size < 1) return;
    
    // Create a circle at this level
    const circle = new VectorCircle(x, y, size / 4);
    circle.strokeColor = `hsl(${depth * 60}, 70%, 50%)`;
    circle.fillColor = `hsla(${depth * 60}, 70%, 50%, 0.1)`;
    addObjectToScene(circle);
    
    // Add some detail objects that become visible at higher zoom levels
    if (depth > 2) {
        const detail = new VectorText(x, y, `L${depth}`, size / 8);
        detail.strokeColor = circle.strokeColor;
        detail.fillColor = circle.strokeColor;
        detail.minZoom = Math.pow(2, depth - 2);
        addObjectToScene(detail);
    }
    
    // Create smaller patterns around this one
    const numBranches = 4;
    const branchSize = size / 2.5;
    const branchDistance = size / 1.5;
    
    for (let i = 0; i < numBranches; i++) {
        const angle = (i / numBranches) * Math.PI * 2;
        const branchX = x + Math.cos(angle) * branchDistance;
        const branchY = y + Math.sin(angle) * branchDistance;
        
        generateFractalPattern(branchX, branchY, branchSize, depth + 1);
    }
}

// Legacy function - now handled by updatePerformanceStats
function updateStats() {
    updatePerformanceStats();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
        case '1':
            setTool('pan');
            break;
        case '2':
            setTool('line');
            break;
        case '3':
            setTool('circle');
            break;
        case '4':
            setTool('rectangle');
            break;
        case '5':
            setTool('bezier');
            break;
        case 'q':
            toggleQuadTree();
            break;
        case 's':
            toggleStats();
            break;
        case 'r':
            generateRandomShapes();
            break;
        case 'c':
            clearCanvas();
            break;
    }
});

// Handle window visibility changes to pause/resume rendering
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause rendering when tab is not visible
        // This is handled automatically by requestAnimationFrame
    } else {
        // Resume rendering when tab becomes visible
        if (engine) {
            engine.render();
        }
    }
});

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export global functions for HTML onclick handlers
window.setTool = setTool;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetView = resetView;
window.toggleQuadTree = toggleQuadTree;
window.toggleStats = toggleStats;
window.generateRandomShapes = generateRandomShapes;
window.clearCanvas = clearCanvas;

// SVG-related global functions
window.loadSVGFile = loadSVGFile;
window.loadSampleSVG = loadSampleSVG;
window.placeSVGAtPosition = placeSVGAtPosition; 