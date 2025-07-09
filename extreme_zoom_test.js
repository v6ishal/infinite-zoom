/**
 * Extreme Zoom Test Script
 * Tests the infinite zoom system at very high zoom levels
 */

function runExtremeZoomTest() {
    console.log("🚀 Starting Extreme Zoom Test");
    
    // Test zoom levels from 1x to 1,000,000x
    const testZoomLevels = [
        1, 10, 100, 1000, 10000, 50000, 100000, 500000, 1000000
    ];
    
    testZoomLevels.forEach(zoomLevel => {
        console.log(`\n📊 Testing zoom level: ${zoomLevel.toLocaleString()}x`);
        
        // Test LOD threshold calculation
        const lodThreshold = engine.quadTree.calculateLODThreshold(zoomLevel);
        console.log(`   LOD Threshold: ${lodThreshold.toFixed(6)}`);
        
        // Test viewport size at this zoom level
        const viewportBounds = engine.getViewportBounds();
        const worldViewportSize = viewportBounds.width;
        console.log(`   World Viewport Size: ${worldViewportSize.toFixed(6)} units`);
        
        // Test quad tree traversal depth
        const maxDepth = Math.min(12, Math.floor(Math.log2(zoomLevel)) + (zoomLevel > 10000 ? 2 : 3));
        console.log(`   Max Quad Tree Depth: ${maxDepth}`);
        
        // Test object query performance
        const startTime = performance.now();
        const visibleObjects = engine.quadTree.queryLOD(viewportBounds, zoomLevel);
        const queryTime = performance.now() - startTime;
        console.log(`   Query Time: ${queryTime.toFixed(2)}ms`);
        console.log(`   Visible Objects: ${visibleObjects.length}`);
        
        // Test precision at extreme zoom levels
        const centerX = 0;
        const centerY = 0;
        const screenPos = engine.worldToScreen(centerX, centerY);
        const backToWorld = engine.screenToWorld(screenPos.x, screenPos.y);
        const precision = Math.abs(backToWorld.x - centerX) + Math.abs(backToWorld.y - centerY);
        console.log(`   Coordinate Precision Error: ${precision.toFixed(10)}`);
    });
    
    console.log("\n✅ Extreme Zoom Test Complete!");
}

// Function to create a stress test with many objects
function createStressTest() {
    console.log("🔧 Creating Stress Test with 10,000 objects");
    
    const bounds = new Rectangle(-50000, -50000, 100000, 100000);
    
    // Clear existing objects
    engine.clearAll();
    
    // Create objects at different scales for testing
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 100000;
        const y = (Math.random() - 0.5) * 100000;
        const size = Math.random() * 100 + 1;
        
        const shapes = [
            () => new VectorCircle(x, y, size),
            () => new VectorRectangle(x, y, size, size),
            () => new VectorLine(x, y, x + size, y + size),
            () => new VectorText(x, y, `${i}`, Math.max(8, size / 5))
        ];
        
        const shape = shapes[Math.floor(Math.random() * shapes.length)]();
        
        // Set different zoom ranges for different objects
        if (i < 1000) {
            // Objects visible at low zoom
            shape.maxZoom = 1000;
        } else if (i < 5000) {
            // Objects visible at medium zoom
            shape.minZoom = 10;
            shape.maxZoom = 100000;
        } else {
            // Objects visible only at high zoom
            shape.minZoom = 1000;
            shape.maxZoom = 1000000;
        }
        
        engine.addObject(shape);
    }
    
    console.log("✅ Stress test created with 10,000 objects");
}

// Function to test extreme zoom performance
function testExtremeZoomPerformance() {
    console.log("⚡ Testing Extreme Zoom Performance");
    
    const testCases = [
        { zoom: 1, name: "Normal" },
        { zoom: 100, name: "High" },
        { zoom: 10000, name: "Very High" },
        { zoom: 100000, name: "Extreme" },
        { zoom: 1000000, name: "Maximum" }
    ];
    
    testCases.forEach(testCase => {
        console.log(`\n🔍 Testing ${testCase.name} zoom (${testCase.zoom}x):`);
        
        // Set zoom level
        engine.setZoom(testCase.zoom);
        
        // Measure render time
        const startTime = performance.now();
        const viewport = engine.getViewportBounds();
        const visibleObjects = engine.quadTree.queryLOD(viewport, testCase.zoom);
        const renderTime = performance.now() - startTime;
        
        console.log(`   Render Time: ${renderTime.toFixed(2)}ms`);
        console.log(`   Visible Objects: ${visibleObjects.length}`);
        console.log(`   Objects per ms: ${(visibleObjects.length / renderTime).toFixed(2)}`);
        
        // Test memory usage
        const memoryUsage = engine.quadTree.estimateMemoryUsage();
        console.log(`   Memory Usage: ${(memoryUsage / 1024).toFixed(2)} KB`);
    });
    
    console.log("\n✅ Performance test complete!");
}

// Add to window for console access
window.runExtremeZoomTest = runExtremeZoomTest;
window.createStressTest = createStressTest;
window.testExtremeZoomPerformance = testExtremeZoomPerformance;

// Auto-run basic test when loaded
setTimeout(() => {
    if (typeof engine !== 'undefined') {
        console.log("🎯 Extreme Zoom Test Script Loaded");
        console.log("Run these commands in console:");
        console.log("- runExtremeZoomTest(): Test zoom levels up to 1,000,000x");
        console.log("- createStressTest(): Create 10,000 test objects");
        console.log("- testExtremeZoomPerformance(): Performance test at different zoom levels");
    }
}, 1000); 