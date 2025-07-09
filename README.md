# Infinite Zoom Vector Graphics with Quad Trees

A comprehensive implementation of infinite zoom for vector graphics using quad tree data structures, similar to apps like Canvas Max and Endless Paper.

## 🌟 Features

- **True Infinite Zoom**: Unlimited zoom depth through automatic zoom level resets - zoom infinitely without limits!
- **Massive Zoom Range**: Zoom from 0.001x to 1,000,000x with seamless level transitions
- **Quad Tree Spatial Partitioning**: Efficient culling of off-screen objects
- **Level of Detail (LOD)**: Automatic detail management based on zoom level
- **Vector Graphics Primitives**: Lines, circles, rectangles, Bézier curves, text, and SVG images
- **SVG Support**: Load and zoom into SVG vector images infinitely without quality loss
- **Interactive Drawing**: Create shapes with mouse/touch input
- **Drag & Drop**: Drop SVG files directly onto the canvas
- **Fractal Test Pattern**: Demonstrates infinite zoom capabilities
- **Performance Monitoring**: Real-time stats and memory usage tracking
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

### Core Components

1. **QuadTree (`quadtree.js`)**: Spatial partitioning data structure
   - Efficiently organizes objects in 2D space
   - Enables fast visibility culling
   - Supports dynamic subdivision and querying

2. **Vector Graphics (`vector-graphics.js`)**: Primitive shapes with LOD support
   - Base `VectorObject` class with zoom-aware rendering
   - Specific implementations for lines, circles, rectangles, curves, and text
   - Automatic detail level management

3. **Infinite Zoom Engine (`infinite-zoom.js`)**: Core rendering and interaction system
   - Viewport management and coordinate transformations
   - Smooth zoom and pan animations
   - Input handling (mouse, touch, keyboard)
   - Performance optimization and statistics

4. **Main Application (`main.js`)**: UI integration and scene management
   - Drawing tools and user interface
   - Event handling and tool switching
   - SVG loading and placement functionality
   - Fractal pattern generation for testing

5. **Sample SVG Files (`sample-svg.html`)**: Test SVG images
   - Geometric logos and patterns
   - Mandala designs
   - Fractal trees
   - Technical diagrams

## 🚀 Getting Started

1. **Clone or Download**: Get the project files
2. **Open `index.html`** in a modern web browser
3. **Start Exploring**: Use the controls to zoom and draw
4. **Test SVG Support**: Open `sample-svg.html` to download test SVG files

### Controls

#### Mouse/Touch
- **Pan**: Drag to move around the canvas
- **Zoom**: Mouse wheel or pinch gestures
- **Draw**: Select a tool and drag to create shapes

#### Keyboard Shortcuts
- `1-5`: Switch between tools (Pan, Line, Circle, Rectangle, Bézier)
- `+/-`: Zoom in/out
- `0`: Reset view
- `Arrow Keys`: Pan viewport
- `Q`: Toggle quad tree visualization
- `S`: Toggle statistics
- `R`: Generate random shapes
- `C`: Clear canvas

#### UI Buttons
- **Drawing Tools**: Line, Circle, Rectangle, Bézier, Pan
- **SVG Tools**: Load SVG File, Load Sample SVG, Place SVG
- **Zoom Controls**: Zoom In/Out, Reset View
- **Options**: Show Quad Tree, Show Stats, Generate Random Shapes, Clear All

## 🧠 How It Works

### Quad Tree Spatial Partitioning

The quad tree divides 2D space into four quadrants recursively:

```
+-------+-------+
|  NW   |  NE   |
+-------+-------+
|  SW   |  SE   |
+-------+-------+
```

**Benefits:**
- O(log n) insertion and query time
- Efficient frustum culling
- Automatic spatial organization
- Memory-efficient for sparse data

### Level of Detail (LOD)

Objects are rendered with different detail levels based on zoom:

```javascript
shouldRenderAtZoom(zoomLevel, lodThreshold) {
    const screenSize = this.getSize() * zoomLevel;
    return screenSize >= lodThreshold;
}
```

**LOD Strategies:**
- **Text**: Only render when large enough to read (>8px)
- **Shapes**: Skip rendering when too small (<0.5px)
- **Details**: Show control points and guides only when zoomed in
- **Traversal**: Limit quad tree depth based on zoom level

### Infinite Zoom Implementation

The system maintains precision at extreme zoom levels through:

1. **Floating Point Precision**: Uses double precision for coordinates
2. **Coordinate Transformation**: Separates world space from screen space
3. **Viewport Culling**: Only renders visible objects
4. **Adaptive Subdivision**: Quad tree depth adapts to zoom level

#### True Infinite Zoom - Bidirectional Zoom Level Reset System

The system implements a clever "zoom level reset" mechanism that enables truly infinite zoom in **both directions**:

**How It Works:**
- **Zooming In**: When you reach 500,000x zoom, the system resets to 2x and scales all objects up
- **Zooming Out**: When you zoom out below 1x (and you're above Level 0), the system resets to 250,000x and scales all objects down
- You can zoom infinitely in both directions, seamlessly transitioning between zoom levels!

**Implementation Details:**
- **Upper Threshold**: 500,000x zoom triggers upward reset
- **Lower Threshold**: 1x zoom triggers downward reset (when level > 0)
- **Bidirectional Scaling**: Objects scale up when going to higher levels, down when going to lower levels
- **Seamless Transitions**: All zoom resets are visually imperceptible
- **Level Tracking**: The system tracks current zoom level (can be positive or zero)
- **Effective Zoom**: Displays the true zoom level across all resets

**Visual Feedback:**
- **Zoom Level Display**: Shows current zoom and level count (e.g., "Zoom: 2.50x (L3)")
- **Effective Zoom**: Displays the total zoom using scientific notation
- **Reset Notifications**: Different icons for up (🔄⬆️) and down (🔄⬇️) level transitions

**Bidirectional Example:**
```
Level 0: 1x → 500,000x (normal zoom)
Level 1: 2x → 500,000x (objects scaled up by 250,000x)
Level 2: 2x → 500,000x (objects scaled up by another 250,000x)

Then zooming out:
Level 2: 250,000x → 1x (reverse transition)
Level 1: 250,000x → 1x (objects scaled down by 250,000x)
Level 0: 500,000x → 1x (back to normal zoom)
```

**Benefits:**
- **True Infinite Zoom**: Unlimited zoom depth in both directions
- **Seamless Experience**: No visual discontinuity during level transitions
- **Efficient Memory**: Only current zoom level objects are scaled
- **Intuitive Navigation**: Natural zoom in/out behavior at all levels

### SVG Vector Image Support

The system supports loading and displaying SVG vector images with true infinite zoom capabilities:

**Loading SVG Images:**
- **File Upload**: Click "Load SVG File" to select from your computer
- **Sample SVGs**: Click "Load Sample SVG" to test with built-in examples
- **Drag & Drop**: Simply drag SVG files onto the canvas

**SVG Features:**
- **Infinite Scalability**: SVG images maintain crisp quality at any zoom level
- **Viewport-Aware Sizing**: SVG automatically sizes to fit the current zoom level view
- **Smart Caching**: Renders SVG at appropriate resolution based on zoom level
- **Placement Preview**: Shows size and position preview when placing SVG
- **Automatic Parsing**: Extracts dimensions and viewBox information
- **Fallback Rendering**: Shows placeholder if SVG fails to load

**Supported SVG Elements:**
- Paths, circles, rectangles, polygons
- Gradients and patterns
- Text elements
- Filters and effects
- Groups and transformations

**Viewport-Aware Sizing:**
- SVG size automatically adjusts to ~20% of current viewport width
- At high zoom levels (>10x): Size is capped relative to zoom for readability
- At low zoom levels (<1x): Minimum size is enforced for visibility
- Size bounds: 10-500 world units for optimal performance
- Real-time preview shows exact placement size and position

### Performance Optimizations

- **Frustum Culling**: Only query objects within viewport
- **Batch Rendering**: Group similar objects for efficient drawing
- **Animation Smoothing**: Interpolated zoom/pan for smooth experience
- **Memory Management**: Automatic cleanup of off-screen objects
- **Adaptive Quality**: Reduce rendering quality at high zoom speeds
- **SVG Caching**: Intelligent caching of SVG renders at different scales

## 📊 Technical Details

### Coordinate Systems

- **World Space**: Infinite precision coordinate system
- **Screen Space**: Pixel coordinates relative to canvas
- **Transformation**: `screen = (world - viewport) * zoom + center`

### Zoom Levels

- **Minimum Zoom**: 0.001x (1000:1 zoom out)
- **Maximum Zoom**: 1,000,000x (1 million times zoom in)
- **Smooth Transitions**: Exponential interpolation
- **Zoom Center**: Maintains point under cursor

### Performance Metrics

The system tracks:
- **Render Time**: Time to draw one frame
- **Visible Objects**: Objects currently being rendered
- **Total Objects**: All objects in the scene
- **Quad Tree Nodes**: Number of spatial partitions
- **Memory Usage**: Estimated memory consumption

## 🎨 Creating Custom Shapes

Extend the `VectorObject` class to create custom shapes:

```javascript
class CustomShape extends VectorObject {
    constructor(x, y, size) {
        super();
        this.x = x;
        this.y = y;
        this.size = size;
    }
    
    getBounds() {
        return new Rectangle(
            this.x - this.size/2,
            this.y - this.size/2,
            this.size,
            this.size
        );
    }
    
    render(ctx, zoomLevel) {
        this.applyStyle(ctx, zoomLevel);
        // Custom rendering code here
    }
    
    shouldRenderAtZoom(zoomLevel, lodThreshold) {
        // Custom LOD logic
        return this.size * zoomLevel >= lodThreshold;
    }
}
```

## 🔧 Configuration Options

### Quad Tree Parameters
- `maxObjects`: Objects per node before subdivision (default: 8)
- `maxLevels`: Maximum tree depth (default: 8)
- `boundary`: Initial world space bounds

### Rendering Settings
- `lodEnabled`: Enable/disable level of detail
- `cullingEnabled`: Enable/disable frustum culling
- `debugMode`: Show quad tree visualization

### Animation Settings
- `animationSpeed`: Zoom/pan interpolation speed (0.15)
- `zoomFactor`: Mouse wheel zoom increment (1.1)

## 📱 Mobile Support

The system supports touch devices with:
- **Touch Pan**: Single finger drag
- **Pinch Zoom**: Two finger zoom (planned)
- **Responsive Layout**: Adapts to screen size
- **Performance Scaling**: Reduces quality on slower devices

## 🎯 Use Cases

This implementation is suitable for:
- **Digital Art Applications**: Vector drawing with infinite canvas
- **Data Visualization**: Zoomable charts and graphs
- **Game Development**: Infinite worlds and detailed maps
- **Educational Tools**: Interactive diagrams and simulations
- **CAD Software**: Technical drawings with precision zoom

## 🚀 Future Enhancements

Potential improvements:
- **WebGL Rendering**: Hardware-accelerated graphics
- **Multi-threaded Culling**: Web Workers for spatial queries
- **Compressed Storage**: Efficient serialization of large scenes
- **Vector Font Support**: Scalable text rendering
- **Layer System**: Multiple drawing layers with blend modes
- **Collaborative Editing**: Real-time multi-user support

## 📚 References

- [Quad Tree Data Structure](https://en.wikipedia.org/wiki/Quadtree)
- [Level of Detail Rendering](https://en.wikipedia.org/wiki/Level_of_detail)
- [HTML5 Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Spatial Indexing](https://en.wikipedia.org/wiki/Spatial_database)

## 🤝 Contributing

Feel free to submit issues and pull requests. Areas for contribution:
- Performance optimizations
- New vector primitive types
- Better LOD algorithms
- Mobile gesture support
- WebGL renderer

## 📄 License

This project is open source and available under the MIT License.

---

**Built with ❤️ for infinite exploration** 