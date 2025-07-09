// Emergency zoom state reset utility
// Run this in the browser console to fix zoom level issues

function resetZoomState() {
    if (typeof engine === 'undefined') {
        console.error('Engine not found. Make sure you run this in the main app.');
        return;
    }
    
    console.log('🔄 Resetting zoom state...');
    
    // Get all objects from all levels before reset
    const levelStats = engine.multiLevelQuadTree.getLevelStats();
    console.log(`Found ${levelStats.totalLevels} levels with objects`);
    
    let totalObjects = 0;
    for (const levelInfo of levelStats.levels) {
        totalObjects += levelInfo.objectCount;
        console.log(`Level ${levelInfo.level}: ${levelInfo.objectCount} objects`);
    }
    
    console.log(`Total objects across all levels: ${totalObjects}`);
    
    // Clear all levels and reset to a fresh state
    engine.multiLevelQuadTree.clearAllLevels();
    
    console.log(`Current level: ${engine.zoomLevelCount}, clearing all objects for fresh start`);
    
    // Instead of trying to reverse complex scaling, just clear and restart
    console.log('Objects cleared. Use "Generate Random Shapes" or draw new shapes to test zoom.');
    
    // Reset zoom engine state
    engine.zoomLevelCount = 0;
    engine.zoomLevel = 1;
    engine.targetZoom = 1;
    engine.viewportX = 0;
    engine.viewportY = 0;
    engine.targetX = 0;
    engine.targetY = 0;
    engine.lastResetTime = 0;
    
    // Reset to level 0
    engine.multiLevelQuadTree.setCurrentLevel(0);
    
    console.log('✅ Zoom state reset complete!');
    console.log('Current zoom level:', engine.zoomLevel);
    console.log('Current level count:', engine.zoomLevelCount);
    console.log('Effective zoom:', engine.getEffectiveZoom());
    console.log('Active levels:', engine.multiLevelQuadTree.getLevelStats().totalLevels);
}

// Auto-run if zoom level is excessive
if (typeof engine !== 'undefined' && Math.abs(engine.zoomLevelCount) > 50) {
    console.warn('🚨 Excessive zoom level detected! Auto-running reset...');
    resetZoomState();
}

// Export function to global scope
window.resetZoomState = resetZoomState;

console.log('🛠️ Zoom reset utility loaded. Run resetZoomState() to fix zoom issues.'); 