
export interface ModifierUiState {
    isSettingsCollapsed: boolean;
    isCharStyleCollapsed: boolean;
    [key: string]: any;
}

export interface PromptItemData {
    frameNumber: number;
    sceneNumber: number;
    sceneTitle?: string;
    characters?: string[];
    duration?: number;
    prompt?: string;
    videoPrompt?: string;
}

export interface SceneContextMap {
    [sceneNumber: string]: string;
}
