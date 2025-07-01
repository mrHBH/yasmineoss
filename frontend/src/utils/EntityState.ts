export interface ComponentState {
    // Marker interface for component states
}

export interface EntityState {
    name: string;
    position: { x: number; y: number; z: number };
    quaternion: { x: number; y: number; z: number; w: number };
    alive: boolean;
    originTileKey: string | null;
    isStreamedEntity: boolean;
    maxDistanceFromMainEntity: number;
    componentStates: { [key: string]: ComponentState };
    componentCreationInfo: any[];
}
