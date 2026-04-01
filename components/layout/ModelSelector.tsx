"use client"

import { ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface Model {
  id: string
  name: string
  description?: string
}

interface ModelSelectorProps {
  models: Model[]
  currentModel: string
  onModelChange: (modelId: string) => void
}

export function ModelSelector({
  models,
  currentModel,
  onModelChange,
}: ModelSelectorProps) {
  const currentModelInfo = models.find((m) => m.id === currentModel)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <span className="font-medium">{currentModelInfo?.name || "选择模型"}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        {models.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onModelChange(model.id)}
            className="flex items-center justify-between py-2"
          >
            <div className="flex flex-col">
              <span className="font-medium">{model.name}</span>
              {model.description && (
                <span className="text-xs text-muted-foreground">
                  {model.description}
                </span>
              )}
            </div>
            {currentModel === model.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
