// src/utils/sceneUtils.ts

export const duplicateScene = (scene: any) => {
    return {
      ...scene,
      id: `scene-${Date.now()}`,
      title: `${scene.title} (Copy)`,
    };
  };
  