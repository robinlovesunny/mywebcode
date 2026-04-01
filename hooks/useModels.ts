"use client"

import { useState, useCallback, useEffect } from "react"

export interface Model {
  id: string
  name: string
  provider?: string
  description?: string
  maxTokens?: number
  supportsTools?: boolean
  supportsVision?: boolean
}

const CURRENT_MODEL_KEY = "ai-agent-current-model"

function loadCurrentModelId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(CURRENT_MODEL_KEY)
  } catch {
    return null
  }
}

function saveCurrentModelId(id: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CURRENT_MODEL_KEY, id)
  } catch (e) {
    console.error("Failed to save current model:", e)
  }
}

export function useModels() {
  const [models, setModels] = useState<Model[]>([])
  const [currentModel, setCurrentModelState] = useState<string>("qwen-plus")
  const [defaultModel, setDefaultModel] = useState<string>("qwen-plus")
  const [isLoading, setIsLoading] = useState(true)

  // 从 API 加载模型列表
  const loadModels = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/models')
      if (response.ok) {
        const data = await response.json()
        
        const loadedModels: Model[] = (data.models || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          description: m.description,
          maxTokens: m.maxTokens,
          supportsTools: m.supportsTools,
          supportsVision: m.supportsVision,
        }))
        
        setModels(loadedModels)
        
        if (data.defaultModel) {
          setDefaultModel(data.defaultModel)
        }
        
        // 恢复用户上次选择的模型
        const savedModel = loadCurrentModelId()
        if (savedModel && loadedModels.some(m => m.id === savedModel)) {
          setCurrentModelState(savedModel)
        } else if (data.defaultModel) {
          setCurrentModelState(data.defaultModel)
        } else if (loadedModels.length > 0) {
          setCurrentModelState(loadedModels[0].id)
        }
      }
    } catch (e) {
      console.error("Failed to load models from API:", e)
      // 如果 API 失败，使用后备模型
      const fallbackModels: Model[] = [
        { id: "qwen-turbo", name: "Qwen Turbo", description: "快速响应，适合日常对话" },
        { id: "qwen-plus", name: "Qwen Plus", description: "平衡性能与速度" },
        { id: "qwen-max", name: "Qwen Max", description: "最强能力，适合复杂任务" },
      ]
      setModels(fallbackModels)
      
      const savedModel = loadCurrentModelId()
      if (savedModel && fallbackModels.some(m => m.id === savedModel)) {
        setCurrentModelState(savedModel)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 初始化加载
  useEffect(() => {
    loadModels()
  }, [loadModels])

  const setCurrentModel = useCallback((modelId: string) => {
    setCurrentModelState(modelId)
    saveCurrentModelId(modelId)
  }, [])

  const getCurrentModelInfo = useCallback(() => {
    return models.find(m => m.id === currentModel) || models[0]
  }, [models, currentModel])

  const refreshModels = useCallback(async () => {
    await loadModels()
  }, [loadModels])

  return {
    models,
    currentModel,
    defaultModel,
    isLoading,
    setCurrentModel,
    getCurrentModelInfo,
    refreshModels,
  }
}
