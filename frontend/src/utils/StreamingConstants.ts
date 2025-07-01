// Streaming World Constants
export const STREAMING_CONSTANTS = {
  // Tile configuration
  TILE_SIZE: 155,
  TILE_RESOLUTION: 100,
  TILE_RANDOM_OBJECTS: 10,
  
  // Loading and visibility
  LOAD_DISTANCE: 200,
  NUM_TILES: 10,
  
  // Entity streaming configuration
  ENTITY_STREAMING_TILE_SIZE: 150, // Smaller than visual tiles for performance
  ENTITY_DISPOSAL_DISTANCE_MULTIPLIER: 1, // Entities disposed at 1x tile size
  ENTITY_RESTORE_DISTANCE_MULTIPLIER: 1, // Entities restored at 1x tile size
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
} as const;

export type StreamingConstants = typeof STREAMING_CONSTANTS;