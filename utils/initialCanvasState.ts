
import { NodeType } from '../types';

export const INITIAL_CANVAS_STATE = {
  "nodes": [
    {
      "type": NodeType.SCRIPT_GENERATOR,
      "title": "Генератор сценариев",
      "value": "{\"prompt\":\"\",\"targetLanguage\":\"en\",\"characterType\":\"simple\",\"useExistingCharacters\":false,\"narratorEnabled\":false,\"narratorMode\":\"normal\",\"summary\":\"\",\"detailedCharacters\":[],\"scenes\":[],\"isAdvancedMode\":false,\"numberOfScenes\":null,\"isDetailedPlot\":false,\"genre\":\"general\",\"genre2\":\"general\",\"noCharacters\":false,\"model\":\"gemini-3-pro-preview\",\"includeSubscribeScene\":false,\"visualStyle\":\"none\",\"customVisualStyle\":\"\",\"generatedStyle\":\"\",\"generateMainChars\":true,\"createSecondaryChars\":true,\"createKeyItems\":true,\"safeGeneration\":false,\"thinkingEnabled\":false,\"scenelessMode\":false,\"simpleActions\":false,\"commercialSafe\":false,\"smartConceptEnabled\":false,\"atmosphericEntryEnabled\":false,\"generationProgress\":null,\"uiState\":{\"isSettingsCollapsed\":true,\"isSummaryCollapsed\":true,\"isStyleCollapsed\":true,\"isCharactersSectionCollapsed\":true,\"isScenesSectionCollapsed\":true,\"collapsedCharacters\":[],\"collapsedScenes\":[]}}",
      "width": 680,
      "height": 800,
      "id": "node-13-1763665880409",
      "position": {
        "x": 180,
        "y": 180
      }
    },
    {
      "type": NodeType.SCRIPT_ANALYZER,
      "title": "Анализатор сценария",
      "value": "{\"characters\":[],\"scenes\":[],\"targetLanguage\":\"en\",\"model\":\"gemini-3-pro-preview\",\"startSceneNumber\":null,\"endSceneNumber\":null,\"framesPerScene\":null,\"minFrames\":null,\"maxFrames\":null,\"hierarchyEnabled\":true,\"mandatoryBgEnabled\":true,\"statePersistenceEnabled\":true,\"livingWorldEnabled\":false,\"extendedAnalysis\":false,\"microActionBreakdown\":false,\"batchProcessing\":true,\"professionalStoryboard\":true,\"cinematographyEnabled\":true,\"safeGeneration\":false,\"thinkingEnabled\":false,\"shotFilter\":\"all\",\"anthroEnabled\":false,\"subscribeEnhancement\":false,\"anatomicalStrictness\":true,\"propConsistency\":true,\"visualStyle\":\"\",\"autoIndexCharacters\":true,\"uiState\":{\"isSettingsCollapsed\":true,\"isCharStyleCollapsed\":true},\"settingsPaneHeight\":200,\"characterPaneHeight\":160,\"generationProgress\":null}",
      "width": 680,
      "height": 800,
      "id": "node-15-1763665895770",
      "position": {
        "x": 940,
        "y": 180
      }
    },
    {
      "type": NodeType.SCRIPT_PROMPT_MODIFIER,
      "title": "Финалайзер промптов",
      "value": "{\"finalPrompts\":[],\"videoPrompts\":[],\"sceneContexts\":{},\"usedCharacters\":[],\"targetLanguage\":\"en\",\"startFrameNumber\":null,\"endFrameNumber\":null,\"startSceneNumber\":null,\"endSceneNumber\":null,\"generationProgress\":null,\"styleOverride\":\"\",\"characterPaneHeight\":162,\"model\":\"gemini-3-pro-preview\",\"disabledInstructionIds\":[\"break_paragraphs\",\"rule_saturation\",\"pm_anthro\"],\"charDescMode\":\"none\",\"safeGeneration\":false,\"thinkingEnabled\":false,\"propEnhancementEnabled\":true,\"uiState\":{\"isSettingsCollapsed\":true,\"isCharStyleCollapsed\":false},\"settingsPaneHeight\":200}",
      "width": 680,
      "height": 800,
      "id": "node-16-1763665908511",
      "position": {
        "x": 1700,
        "y": 180
      }
    },
    {
      "type": NodeType.CHARACTER_GENERATOR,
      "title": "Генератор персонажей",
      "value": "{\"prompt\":\"\",\"numberOfCharacters\":1,\"targetLanguage\":\"en\",\"characterType\":\"simple\",\"style\":\"simple\",\"customStyle\":\"\",\"characters\":[]}",
      "width": 680,
      "height": 800,
      "id": "node-17-1763665920176",
      "position": {
        "x": 180,
        "y": 1340
      }
    },
    {
      "type": NodeType.YOUTUBE_TITLE_GENERATOR,
      "title": "Генератор заголовков YouTube",
      "value": "{\"mode\":\"title\",\"idea\":\"\",\"targetLanguages\":{\"ru\":true,\"en\":false},\"generatedTitleOutputs\":{},\"generatedChannelOutputs\":{}}",
      "width": 680,
      "height": 800,
      "id": "node-18-1763665947291",
      "position": {
        "x": 3220,
        "y": 1340
      }
    },
    {
      "type": NodeType.NARRATOR_TEXT_GENERATOR,
      "title": "Генератор текста диктора",
      "value": "{\"prompt\":\"\",\"role\":\"narrator\",\"generatedTexts\":{\"ru\":\"\",\"en\":\"\"},\"targetLanguages\":{\"ru\":true,\"en\":true},\"generateSSML\":false}",
      "width": 680,
      "height": 800,
      "id": "node-19-1763665953580",
      "position": {
        "x": 940,
        "y": 1340
      }
    },
    {
      "type": NodeType.SPEECH_SYNTHESIZER,
      "title": "Синтезатор речи",
      "value": "{\"inputText\":\"\",\"voice\":\"Zephyr\",\"audioFiles\":[],\"startSceneNumber\":null,\"endSceneNumber\":null,\"intonation\":\"standard\",\"mode\":\"simple\",\"isMultiSpeaker\":false,\"speaker1Name\":\"Man\",\"speaker1Voice\":\"Zephyr\",\"speaker2Name\":\"Woman\",\"speaker2Voice\":\"Kore\"}",
      "width": 680,
      "height": 800,
      "id": "node-21-1763665961743",
      "position": {
        "x": 1700,
        "y": 1340
      }
    },
    {
      "type": NodeType.MUSIC_IDEA_GENERATOR,
      "title": "Генератор музыкальных идей",
      "value": "{\"generateLyrics\":true,\"idea\":\"\",\"targetLanguages\":{\"ru\":true,\"en\":false},\"generatedLyrics\":{},\"generatedMusicPrompts\":{},\"generatedTitles\":{}}",
      "width": 680,
      "height": 800,
      "id": "node-31-1764450930993",
      "position": {
        "x": 2460,
        "y": 1340
      }
    }
  ],
  "connections": [
    {
      "fromNodeId": "node-13-1763665880409",
      "toNodeId": "node-15-1763665895770",
      "fromHandleId": "all-script-parts",
      "fromPointOffset": {
        "x": 681.2500038165192,
        "y": 419.99998694653596
      },
      "id": "conn-1763665902004-t74xvfcuv"
    },
    {
      "fromNodeId": "node-15-1763665895770",
      "toNodeId": "node-16-1763665908511",
      "fromHandleId": "all-script-analyzer-data",
      "toHandleId": "all-script-analyzer-data",
      "fromPointOffset": {
        "x": 681.2499748553378,
        "y": 419.99998694653596
      },
      "id": "conn-1763665935004-en9p0i2wu"
    },
    {
      "fromNodeId": "node-19-1763665953580",
      "toNodeId": "node-21-1763665961743",
      "fromHandleId": "ru",
      "fromPointOffset": {
        "x": 681.249946470853,
        "y": 400.99999128512286
      },
      "id": "conn-1763665983386-jjaugycj8"
    }
  ],
  "groups": [],
  "viewTransform": {
    "scale": 1,
    "translate": {
      "x": -10.476763626649245,
      "y": -116.12297952975814
    }
  },
  "nodeIdCounter": 32
};
