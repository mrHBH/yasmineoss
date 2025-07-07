// Streaming World Constants
export const STREAMING_CONSTANTS = {
  // Tile configuration
  TILE_SIZE: 100,
  TILE_RESOLUTION: 10,
  TILE_RANDOM_OBJECTS: 1,
  
  // Loading and visibility
  LOAD_DISTANCE: 150,
  NUM_TILES: 10,
  
  // Entity streaming configuration
  ENTITY_STREAMING_TILE_SIZE: 150, // Smaller than visual tiles for performance
  ENTITY_DISPOSAL_DISTANCE_MULTIPLIER: 2, // Entities disposed at 1x tile size
  ENTITY_RESTORE_DISTANCE_MULTIPLIER: 1.5, // Entities restored at 1x tile size
  ENTITY_STREAMING_CHECK_INTERVAL: 1000, // ms
  ENTITY_NUM_TILES: 3, // Smaller range than visual tiles
  
  // Cache management
  CACHE_CLEANUP_INTERVAL: 30000, // 30 seconds
  MAX_CACHE_ENTRIES: 50, // Maximum cache entries before forced cleanup
  CACHE_MAX_AGE_AGGRESSIVE: 60000, // 1 minute
  CACHE_MAX_AGE_NORMAL: 120000, // 2 minutes
  CACHE_STALE_THRESHOLD: 300000, // 5 minutes
  
  // Performance thresholds
  PURGE_DISTANCE: 300, // If player moves far from cached areas, purge old cache
  RETURN_THRESHOLD: 100, // Distance threshold to consider "returning"
  MAX_PHYSICS_BODIES_WARNING: 1000, // Warning threshold for physics bodies
  SLOW_UPDATE_WARNING_MS: 16, // More than one frame at 60fps
  
  // Memory management
  MESH_UPDATE_DISTANCE_THRESHOLD: 0.01, // Only update mesh if position changed significantly
  
  // Entity streaming performance
  MAX_ENTITIES_RESTORED_PER_FRAME: 1, // Max entities to restore per frame to prevent stutters (reduced from 2)
  ENTITY_RESTORATION_FRAME_DELAY: 4, // ms delay between restoration batches (reduced for faster loading)
  ASYNC_COMPONENT_LOADING: false, // Load components asynchronously to prevent blocking
  
  // Entity streaming optimization
  ENTITY_PRELOAD_DISTANCE_MULTIPLIER: 1.5, // Start loading entities at 1.5x tile size
  ENTITY_STATE_CACHE_MAX_AGE: 300000, // 5 minutes - how long to keep entity states cached
  COMPONENT_LOADING_BATCH_SIZE: 1, // Load one component at a time to prevent blocking
  ENTITY_INIT_DELAY: 8, // ms delay between entity initializations
  
  // Model loading optimization
  MODEL_LOADING_FRAME_YIELD_INTERVAL: 1, // Yield every N model loads
  ANIMATION_LOADING_FRAME_DELAY: 4, // ms delay between animation loads
  COMPONENT_INIT_FRAME_DELAY: 2, // ms delay between component initializations
} as const;

export type StreamingConstants = typeof STREAMING_CONSTANTS;