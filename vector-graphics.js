/**
 * Vector Graphics Primitives with Level-of-Detail Support
 * Each primitive knows how to render itself at different zoom levels
 */

// Base class for all vector graphics objects
class VectorObject {
    constructor(id) {
        this.id = id || Math.random().toString(36).substr(2, 9);
        this.strokeColor = '#ffffff';
        this.fillColor = 'transparent';
        this.strokeWidth = 2;
        this.opacity = 1;
        this.minZoom = 0.01; // Minimum zoom level to render
        this.maxZoom = 1000000;  // Maximum zoom level to render (1 million times)
    }
    
    // Override in subclasses
    getBounds() {
        throw new Error('getBounds must be implemented in subclass');
    }
    
    // Override in subclasses
    render(ctx, zoomLevel) {
        throw new Error('render must be implemented in subclass');
    }
    
    // Determine if object should be rendered at current zoom level
    shouldRenderAtZoom(zoomLevel, lodThreshold) {
        if (zoomLevel < this.minZoom || zoomLevel > this.maxZoom) {
            return false;
        }
        
        const bounds = this.getBounds();
        const size = Math.min(bounds.width, bounds.height) * zoomLevel;
        return size >= lodThreshold;
    }
    
    // Apply common styling
    applyStyle(ctx, zoomLevel) {
        ctx.strokeStyle = this.strokeColor;
        ctx.fillStyle = this.fillColor;
        ctx.lineWidth = this.strokeWidth / zoomLevel;
        ctx.globalAlpha = this.opacity;
    }
    
    // Get approximate size for LOD calculations
    getSize() {
        const bounds = this.getBounds();
        return Math.min(bounds.width, bounds.height);
    }
    
    // Update bounding box (called after scaling)
    updateBounds() {
        // This is a no-op by default since getBounds() calculates dynamically
        // Subclasses can override if they cache bounds
    }
}

// Line primitive
class VectorLine extends VectorObject {
    constructor(x1, y1, x2, y2, id) {
        super(id);
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.strokeColor = '#00ff00';
    }
    
    getBounds() {
        const minX = Math.min(this.x1, this.x2) - this.strokeWidth / 2;
        const minY = Math.min(this.y1, this.y2) - this.strokeWidth / 2;
        const maxX = Math.max(this.x1, this.x2) + this.strokeWidth / 2;
        const maxY = Math.max(this.y1, this.y2) + this.strokeWidth / 2;
        
        return new Rectangle(minX, minY, maxX - minX, maxY - minY);
    }
    
    render(ctx, zoomLevel) {
        this.applyStyle(ctx, zoomLevel);
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();
    }
    
    getLength() {
        const dx = this.x2 - this.x1;
        const dy = this.y2 - this.y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

// Circle primitive
class VectorCircle extends VectorObject {
    constructor(x, y, radius, id) {
        super(id);
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.strokeColor = '#ff0000';
        this.fillColor = 'rgba(255, 0, 0, 0.1)';
    }
    
    getBounds() {
        return new Rectangle(
            this.x - this.radius - this.strokeWidth / 2,
            this.y - this.radius - this.strokeWidth / 2,
            (this.radius + this.strokeWidth / 2) * 2,
            (this.radius + this.strokeWidth / 2) * 2
        );
    }
    
    render(ctx, zoomLevel) {
        this.applyStyle(ctx, zoomLevel);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        if (this.fillColor !== 'transparent') {
            ctx.fill();
        }
        ctx.stroke();
    }
    
    shouldRenderAtZoom(zoomLevel, lodThreshold) {
        // For circles, consider the diameter
        const screenSize = this.radius * 2 * zoomLevel;
        return screenSize >= lodThreshold && super.shouldRenderAtZoom(zoomLevel, lodThreshold);
    }
}

// Rectangle primitive
class VectorRectangle extends VectorObject {
    constructor(x, y, width, height, id) {
        super(id);
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.strokeColor = '#0000ff';
        this.fillColor = 'rgba(0, 0, 255, 0.1)';
    }
    
    getBounds() {
        return new Rectangle(
            this.x - this.strokeWidth / 2,
            this.y - this.strokeWidth / 2,
            this.width + this.strokeWidth,
            this.height + this.strokeWidth
        );
    }
    
    render(ctx, zoomLevel) {
        this.applyStyle(ctx, zoomLevel);
        
        if (this.fillColor !== 'transparent') {
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

// Bezier curve primitive
class VectorBezier extends VectorObject {
    constructor(x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2, id) {
        super(id);
        this.x1 = x1;
        this.y1 = y1;
        this.cp1x = cp1x;
        this.cp1y = cp1y;
        this.cp2x = cp2x;
        this.cp2y = cp2y;
        this.x2 = x2;
        this.y2 = y2;
        this.strokeColor = '#ffff00';
    }
    
    getBounds() {
        // Calculate bounding box for bezier curve
        const minX = Math.min(this.x1, this.cp1x, this.cp2x, this.x2) - this.strokeWidth / 2;
        const minY = Math.min(this.y1, this.cp1y, this.cp2y, this.y2) - this.strokeWidth / 2;
        const maxX = Math.max(this.x1, this.cp1x, this.cp2x, this.x2) + this.strokeWidth / 2;
        const maxY = Math.max(this.y1, this.cp1y, this.cp2y, this.y2) + this.strokeWidth / 2;
        
        return new Rectangle(minX, minY, maxX - minX, maxY - minY);
    }
    
    render(ctx, zoomLevel) {
        this.applyStyle(ctx, zoomLevel);
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.bezierCurveTo(this.cp1x, this.cp1y, this.cp2x, this.cp2y, this.x2, this.y2);
        ctx.stroke();
        
        // Draw control points when zoomed in enough
        if (zoomLevel > 2) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.lineWidth = 1 / zoomLevel;
            ctx.setLineDash([5 / zoomLevel, 5 / zoomLevel]);
            
            // Control lines
            ctx.beginPath();
            ctx.moveTo(this.x1, this.y1);
            ctx.lineTo(this.cp1x, this.cp1y);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(this.x2, this.y2);
            ctx.lineTo(this.cp2x, this.cp2y);
            ctx.stroke();
            
            // Control points
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(this.cp1x, this.cp1y, 3 / zoomLevel, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(this.cp2x, this.cp2y, 3 / zoomLevel, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }
    }
}

// Complex shape made of multiple primitives
class VectorGroup extends VectorObject {
    constructor(id) {
        super(id);
        this.objects = [];
        this.strokeColor = '#ffffff';
    }
    
    addObject(obj) {
        this.objects.push(obj);
    }
    
    getBounds() {
        if (this.objects.length === 0) {
            return new Rectangle(0, 0, 0, 0);
        }
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        for (const obj of this.objects) {
            const bounds = obj.getBounds();
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        }
        
        return new Rectangle(minX, minY, maxX - minX, maxY - minY);
    }
    
    render(ctx, zoomLevel) {
        for (const obj of this.objects) {
            if (obj.shouldRenderAtZoom(zoomLevel, 0.5)) {
                obj.render(ctx, zoomLevel);
            }
        }
    }
    
    shouldRenderAtZoom(zoomLevel, lodThreshold) {
        // A group should render if any of its objects should render
        return this.objects.some(obj => obj.shouldRenderAtZoom(zoomLevel, lodThreshold));
    }
}

// Text primitive with different LOD levels
class VectorText extends VectorObject {
    constructor(x, y, text, fontSize = 16, id) {
        super(id);
        this.x = x;
        this.y = y;
        this.text = text;
        this.fontSize = fontSize;
        this.fontFamily = 'Arial';
        this.strokeColor = '#ffffff';
        this.fillColor = '#ffffff';
        this.minZoom = 0.1; // Don't render text when too zoomed out
    }
    
    getBounds() {
        // Rough estimate of text bounds
        const width = this.text.length * this.fontSize * 0.6;
        const height = this.fontSize * 1.2;
        
        return new Rectangle(
            this.x - this.strokeWidth / 2,
            this.y - height - this.strokeWidth / 2,
            width + this.strokeWidth,
            height + this.strokeWidth
        );
    }
    
    render(ctx, zoomLevel) {
        const screenFontSize = this.fontSize * zoomLevel;
        
        // Don't render text if it's too small to read
        if (screenFontSize < 8) {
            return;
        }
        
        this.applyStyle(ctx, zoomLevel);
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        
        if (this.fillColor !== 'transparent') {
            ctx.fillText(this.text, this.x, this.y);
        }
        
        if (this.strokeColor !== 'transparent' && this.strokeWidth > 0) {
            ctx.strokeText(this.text, this.x, this.y);
        }
    }
    
    shouldRenderAtZoom(zoomLevel, lodThreshold) {
        const screenFontSize = this.fontSize * zoomLevel;
        return screenFontSize >= 8 && super.shouldRenderAtZoom(zoomLevel, lodThreshold);
    }
}

// SVG Image primitive with infinite zoom support
class VectorSVG extends VectorObject {
    constructor(x, y, width, height, svgContent, id) {
        super(id);
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.svgContent = svgContent;
        this.strokeColor = '#ffffff';
        this.fillColor = 'transparent';
        this.opacity = 1;
        
        // Parse SVG to get original dimensions
        this.originalWidth = width;
        this.originalHeight = height;
        this.aspectRatio = width / height;
        
        // Cache for rendered SVG
        this.svgElement = null;
        this.imageCache = new Map(); // Cache rendered images at different scales
        
        this.parseSVG();
    }
    
    parseSVG() {
        try {
            // Create a temporary div to parse SVG
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.svgContent;
            const svgElement = tempDiv.querySelector('svg');
            
            if (svgElement) {
                // Get original SVG dimensions
                const viewBox = svgElement.getAttribute('viewBox');
                if (viewBox) {
                    const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(Number);
                    this.originalWidth = vw;
                    this.originalHeight = vh;
                    this.aspectRatio = vw / vh;
                }
                
                // Store the SVG element for rendering
                this.svgElement = svgElement;
                
                // Set default dimensions if not specified
                if (!this.width || !this.height) {
                    this.width = this.originalWidth || 100;
                    this.height = this.originalHeight || 100;
                }
            }
        } catch (error) {
            console.error('Error parsing SVG:', error);
        }
    }
    
    getBounds() {
        return new Rectangle(
            this.x - this.strokeWidth / 2,
            this.y - this.strokeWidth / 2,
            this.width + this.strokeWidth,
            this.height + this.strokeWidth
        );
    }
    
    async renderSVGToCanvas(ctx, scale = 1) {
        return new Promise((resolve, reject) => {
            if (!this.svgElement) {
                resolve(null);
                return;
            }
            
            // Check cache first
            const cacheKey = `${scale.toFixed(3)}`;
            if (this.imageCache.has(cacheKey)) {
                resolve(this.imageCache.get(cacheKey));
                return;
            }
            
            // Create a blob from SVG content
            const svgClone = this.svgElement.cloneNode(true);
            
            // Set dimensions for rendering
            const renderWidth = this.width * scale;
            const renderHeight = this.height * scale;
            
            svgClone.setAttribute('width', renderWidth);
            svgClone.setAttribute('height', renderHeight);
            
            // Ensure proper scaling
            if (!svgClone.getAttribute('viewBox')) {
                svgClone.setAttribute('viewBox', `0 0 ${this.originalWidth} ${this.originalHeight}`);
            }
            
            const svgString = new XMLSerializer().serializeToString(svgClone);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            
            const img = new Image();
            img.onload = () => {
                // Cache the rendered image
                this.imageCache.set(cacheKey, img);
                URL.revokeObjectURL(url);
                resolve(img);
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load SVG image'));
            };
            
            img.src = url;
        });
    }
    
    render(ctx, zoomLevel) {
        this.applyStyle(ctx, zoomLevel);
        
        // Calculate appropriate scale for rendering
        const screenWidth = this.width * zoomLevel;
        const screenHeight = this.height * zoomLevel;
        
        // Don't render if too small
        if (screenWidth < 1 || screenHeight < 1) {
            return;
        }
        
        // Determine rendering scale based on zoom level
        let renderScale = 1;
        if (zoomLevel > 2) {
            // For high zoom levels, render at higher resolution
            renderScale = Math.min(4, Math.sqrt(zoomLevel));
        }
        
        // Check cache for existing image
        const cacheKey = `${renderScale.toFixed(3)}`;
        const cachedImg = this.imageCache.get(cacheKey);
        
        if (cachedImg) {
            // Render cached image immediately
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.drawImage(cachedImg, this.x, this.y, this.width, this.height);
            ctx.restore();
        } else {
            // Render placeholder while loading
            this.renderPlaceholder(ctx, zoomLevel);
            
            // Async load the SVG image
            this.renderSVGToCanvas(ctx, renderScale).then(img => {
                if (img) {
                    // Image loaded, trigger a redraw
                    requestAnimationFrame(() => {
                        // The next frame will use the cached image
                    });
                }
            }).catch(error => {
                console.error('Error rendering SVG:', error);
            });
        }
    }
    
    renderPlaceholder(ctx, zoomLevel) {
        ctx.save();
        ctx.strokeStyle = '#4ecdc4';
        ctx.fillStyle = 'rgba(78, 205, 196, 0.1)';
        ctx.lineWidth = 2 / zoomLevel;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw "SVG" text
        ctx.fillStyle = '#4ecdc4';
        ctx.font = `${Math.max(12, 20 / zoomLevel)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SVG', this.x + this.width / 2, this.y + this.height / 2);
        
        ctx.restore();
    }
    
    shouldRenderAtZoom(zoomLevel, lodThreshold) {
        // SVG images should render at most zoom levels since they're vector-based
        const screenSize = Math.min(this.width, this.height) * zoomLevel;
        return screenSize >= lodThreshold * 0.5; // More lenient threshold for SVG
    }
    
    // Resize SVG while maintaining aspect ratio
    resize(newWidth, newHeight, maintainAspectRatio = true) {
        if (maintainAspectRatio) {
            const scale = Math.min(newWidth / this.width, newHeight / this.height);
            this.width *= scale;
            this.height *= scale;
        } else {
            this.width = newWidth;
            this.height = newHeight;
        }
        
        // Clear cache when resizing
        this.imageCache.clear();
    }
    
    // Move SVG to new position
    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }
    
    // Get SVG content as string
    getSVGContent() {
        return this.svgContent;
    }
    
    // Clear image cache to free memory
    clearCache() {
        this.imageCache.clear();
    }
    
    // Clone the SVG object
    clone() {
        return new VectorSVG(
            this.x, this.y,
            this.width, this.height,
            this.svgContent,
            this.id + '_clone'
        );
    }
}

// SVG Loader utility functions
class SVGLoader {
    static async loadFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.includes('svg')) {
                reject(new Error('File is not an SVG'));
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const svgContent = e.target.result;
                    resolve(svgContent);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    static async loadFromURL(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            throw new Error(`Failed to load SVG from URL: ${error.message}`);
        }
    }
    
    static createSVGObject(svgContent, x = 0, y = 0, width = null, height = null) {
        // Parse SVG to get dimensions if not provided
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svgContent;
        const svgElement = tempDiv.querySelector('svg');
        
        if (!svgElement) {
            throw new Error('Invalid SVG content');
        }
        
        // Get original dimensions
        let originalWidth = 100;
        let originalHeight = 100;
        
        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
            const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(Number);
            originalWidth = vw;
            originalHeight = vh;
        } else {
            originalWidth = parseFloat(svgElement.getAttribute('width')) || 100;
            originalHeight = parseFloat(svgElement.getAttribute('height')) || 100;
        }
        
        // Use provided dimensions or original dimensions
        const finalWidth = width || originalWidth;
        const finalHeight = height || originalHeight;
        
        return new VectorSVG(x, y, finalWidth, finalHeight, svgContent);
    }
}

// Factory function to create random shapes for testing
function createRandomShape(bounds) {
    const types = ['line', 'circle', 'rectangle', 'bezier', 'text'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const x = bounds.x + Math.random() * bounds.width;
    const y = bounds.y + Math.random() * bounds.height;
    
    switch (type) {
        case 'line':
            return new VectorLine(
                x, y,
                x + (Math.random() - 0.5) * 200,
                y + (Math.random() - 0.5) * 200
            );
            
        case 'circle':
            return new VectorCircle(x, y, Math.random() * 50 + 10);
            
        case 'rectangle':
            return new VectorRectangle(
                x, y,
                Math.random() * 100 + 20,
                Math.random() * 100 + 20
            );
            
        case 'bezier':
            return new VectorBezier(
                x, y,
                x + (Math.random() - 0.5) * 100,
                y + (Math.random() - 0.5) * 100,
                x + (Math.random() - 0.5) * 100,
                y + (Math.random() - 0.5) * 100,
                x + (Math.random() - 0.5) * 200,
                y + (Math.random() - 0.5) * 200
            );
            
        case 'text':
            const texts = ['Hello', 'World', 'Zoom', 'Vector', 'Graphics', 'QuadTree'];
            return new VectorText(
                x, y,
                texts[Math.floor(Math.random() * texts.length)],
                Math.random() * 20 + 12
            );
    }
}

// Performance optimized rendering batch
class RenderBatch {
    constructor() {
        this.objects = [];
        this.sortedByType = new Map();
    }
    
    addObject(obj) {
        this.objects.push(obj);
        const type = obj.constructor.name;
        if (!this.sortedByType.has(type)) {
            this.sortedByType.set(type, []);
        }
        this.sortedByType.get(type).push(obj);
    }
    
    render(ctx, zoomLevel) {
        // Render objects grouped by type for better performance
        for (const [type, objects] of this.sortedByType) {
            for (const obj of objects) {
                try {
                    obj.render(ctx, zoomLevel);
                } catch (error) {
                    console.error(`Error rendering ${type}:`, error);
                }
            }
        }
    }
    
    clear() {
        this.objects = [];
        this.sortedByType.clear();
    }
    
    size() {
        return this.objects.length;
    }
} 