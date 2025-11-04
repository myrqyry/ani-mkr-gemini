
import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { AppState, AppStatus, AppError, ImageState, AppAction } from '../types/types';
import { AnimationAssets, BoundingBox } from '../services/gemini';
import { uiReducer } from '../reducers/uiReducer';
import { animationReducer } from '../reducers/animationReducer';
import { imageReducer } from '../reducers/imageReducer';
import { initialState } from '../reducers/initialState';

// Define the shape of the sliced state
interface UIState {
    appStatus: AppStatus;
    loadingMessage: string;
    error: AppError | null;
    isPromptFocused: boolean;
    isCameraOpen: boolean;
    isExportModalOpen: boolean;
    hasMultipleCameras: boolean;
    typedPlaceholder: string;
}

interface AnimationState {
    animationAssets: AnimationAssets | null;
    detectedObjects: BoundingBox[] | null;
    storyPrompt: string;
    frameCount: number;
    postProcessStrength: number;
    styleIntensity: number;
}

interface ImageStateSlice {
    imageState: ImageState;
    selectedAsset: { uri: string } | null;
}

// Define the shape of the actions
interface UIActions {
    setAppStatus: (payload: AppStatus) => void;
    setLoadingMessage: (payload: string) => void;
    setError: (payload: AppError | null) => void;
    setIsPromptFocused: (payload: boolean) => void;
    setIsCameraOpen: (payload: boolean) => void;
    setIsExportModalOpen: (payload: boolean) => void;
    setHasMultipleCameras: (payload: boolean) => void;
    setTypedPlaceholder: (payload: string) => void;
}

interface AnimationActions {
    setAnimationAssets: (payload: AnimationAssets | null) => void;
    setDetectedObjects: (payload: BoundingBox[] | null) => void;
    setStoryPrompt: (payload: string) => void;
    setFrameCount: (payload: number) => void;
    setPostProcessStrength: (payload: number) => void;
    setStyleIntensity: (payload: number) => void;
}

interface ImageActions {
    setImageState: (payload: Partial<ImageState>) => void;
    setSelectedAsset: (payload: any) => void;
}

// Create the contexts
interface AppStateContextValue {
    ui: UIState;
    animation: AnimationState;
    image: ImageStateSlice;
}

interface AppActionsContextValue {
    uiActions: UIActions;
    animationActions: AnimationActions;
    imageActions: ImageActions;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);
const AppActionsContext = createContext<AppActionsContextValue | null>(null);

//action creators
const createUIActions = (dispatch: React.Dispatch<AppAction>): UIActions => ({
    setAppStatus: (payload) => dispatch({ type: 'SET_APP_STATUS', payload }),
    setLoadingMessage: (payload) => dispatch({ type: 'SET_LOADING_MESSAGE', payload }),
    setError: (payload) => dispatch({ type: 'SET_ERROR', payload }),
    setIsPromptFocused: (payload) => dispatch({ type: 'SET_IS_PROMPT_FOCUSED', payload }),
    setIsCameraOpen: (payload) => dispatch({ type: 'SET_IS_CAMERA_OPEN', payload }),
    setIsExportModalOpen: (payload) => dispatch({ type: 'SET_IS_EXPORT_MODAL_OPEN', payload }),
    setHasMultipleCameras: (payload) => dispatch({ type: 'SET_HAS_MULTIPLE_CAMERAS', payload }),
    setTypedPlaceholder: (payload) => dispatch({ type: 'SET_TYPED_PLACEHOLDER', payload }),
});

const createAnimationActions = (dispatch: React.Dispatch<AppAction>): AnimationActions => ({
    setAnimationAssets: (payload) => dispatch({ type: 'SET_ANIMATION_ASSETS', payload }),
    setDetectedObjects: (payload) => dispatch({ type: 'SET_DETECTED_OBJECTS', payload }),
    setStoryPrompt: (payload) => dispatch({ type: 'SET_STORY_PROMPT', payload }),
    setFrameCount: (payload) => dispatch({ type: 'SET_FRAME_COUNT', payload }),
    setPostProcessStrength: (payload) => dispatch({ type: 'SET_POST_PROCESS_STRENGTH', payload }),
    setStyleIntensity: (payload) => dispatch({ type: 'SET_STYLE_INTENSITY', payload }),
});

const createImageActions = (dispatch: React.Dispatch<any>): ImageActions => ({
    setImageState: (payload) => dispatch({ type: 'SET_IMAGE_STATE', payload }),
    setSelectedAsset: (payload) => dispatch({ type: 'SET_SELECTED_ASSET', payload }),
});

// Create the provider
export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [uiState, uiDispatch] = useReducer(uiReducer, initialState.ui);
    const [animationState, animationDispatch] = useReducer(animationReducer, initialState.animation);
    const [imageState, imageDispatch] = useReducer(imageReducer, initialState.image);

    const stateValue = useMemo(() => ({
        ui: {
            appStatus: uiState.appStatus,
            loadingMessage: uiState.loadingMessage,
            error: uiState.error,
            isPromptFocused: uiState.isPromptFocused,
            isCameraOpen: uiState.isCameraOpen,
            isExportModalOpen: uiState.isExportModalOpen,
            hasMultipleCameras: uiState.hasMultipleCameras,
            typedPlaceholder: uiState.typedPlaceholder,
        },
        animation: {
            animationAssets: animationState.animationAssets,
            detectedObjects: animationState.detectedObjects,
            storyPrompt: animationState.storyPrompt,
            frameCount: animationState.frameCount,
            postProcessStrength: animationState.postProcessStrength,
            styleIntensity: animationState.styleIntensity,
        },
        image: {
            imageState: imageState.imageState,
            selectedAsset: imageState.selectedAsset,
        },
    }), [uiState, animationState, imageState]);

    const actionsValue = useMemo(() => ({
        uiActions: createUIActions(uiDispatch),
        animationActions: createAnimationActions(animationDispatch),
        imageActions: createImageActions(imageDispatch),
    }), []);

    return (
        <AppStateContext.Provider value={stateValue}>
            <AppActionsContext.Provider value={actionsValue}>
                {children}
            </AppActionsContext.Provider>
        </AppStateContext.Provider>
    );
};

// Create specialized hooks for specific state slices
export const useUIState = () => {
    const context = useContext(AppStateContext);
    if (!context) throw new Error('useUIState must be used within AppStateProvider');
    const actions = useContext(AppActionsContext);
    if (!actions) throw new Error('useUIState must be used within AppStateProvider');
    return { ui: context.ui, actions: actions.uiActions };
};

export const useAnimationState = () => {
    const context = useContext(AppStateContext);
    if (!context) throw new Error('useAnimationState must be used within AppStateProvider');
    const actions = useContext(AppActionsContext);
    if (!actions) throw new Error('useAnimationState must be used within AppStateProvider');
    return { animation: context.animation, actions: actions.animationActions };
};

export const useImageState = () => {
    const context = useContext(AppStateContext);
    if (!context) throw new Error('useImageState must be used within AppStateProvider');
    const actions = useContext(AppActionsContext);
    if (!actions) throw new Error('useImageState must be used within AppStateProvider');
    return { image: context.image, actions: actions.imageActions };
};
