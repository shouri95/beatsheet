// src/utils/screenplayFormatter.ts

interface Scene {
    id: string
    title: string
    scriptContent: string
    position: { x: number; y: number }
    size: { width: number; height: number }
    characters: string[]
    props: string[]
    color: string
  }
  
  interface Character {
    id: string
    name: string
    description: string
  }
  
  export const formatScreenplay = (scenes: Scene[], characters: Character[]): string => {
    let screenplay = ''
  
    scenes.forEach((scene, index) => {
      screenplay += formatScene(scene, characters)
      screenplay += '\n\n'
    })
  
    return screenplay.trim()
  }
  
  export const formatScene = (scene: Scene, characters: Character[]): string => {
    const sceneNumber = scene.title.replace(/\D/g, '') || 'INT/EXT'
    const sceneHeading = `\n${scene.title.toUpperCase()}\n`
    
    const formattedScript = scene.scriptContent.replace(/\n/g, '\n')
  
    const sceneCharacters = characters.filter(char => scene.characters.includes(char.id))
  
    let dialogues = ''
    sceneCharacters.forEach(char => {
      const dialogueStart = formattedScript.indexOf(`${char.name}:`)
      if (dialogueStart !== -1) {
        const dialogueEnd = formattedScript.indexOf('\n', dialogueStart)
        const dialogue = formattedScript.substring(dialogueStart, dialogueEnd)
        dialogues += `\n${char.name.toUpperCase()}\n    ${dialogue.split(':')[1].trim()}\n`
      }
    })
  
    return `${sceneHeading}${formattedScript}${dialogues}`
  }
  