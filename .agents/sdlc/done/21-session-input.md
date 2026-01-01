# Session Input Component

## Context
The prompt input where users type messages. Needs model/agent selection, file attachments, and submit functionality. Should support multi-line input with keyboard shortcuts.

## Acceptance Criteria
- [x] Multi-line text input with auto-resize
- [x] Submit on Cmd/Ctrl+Enter
- [x] Shift+Enter for newlines
- [x] Agent selector dropdown
- [x] Model selector dropdown
- [x] File attachment support
- [x] Paste image from clipboard
- [x] Disable input during generation
- [x] Abort button during generation
- [x] Character/token count indicator

## Technical Guidance

### Prompt Input Component
```tsx
// components/session/prompt-input.tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/button';
import { AgentSelector } from './agent-selector';
import { ModelSelector } from './model-selector';
import { Send, Square, Paperclip, X } from 'lucide-react';

interface PromptInputProps {
  sessionId: string;
}

export function PromptInput({ sessionId }: PromptInputProps) {
  const { sendMessage, abort, isWorking } = useSession(sessionId);
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>();
  const [selectedModel, setSelectedModel] = useState<{ providerID: string; modelID: string } | undefined>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() && files.length === 0) return;
    if (isWorking) return;

    // Convert files to attachment format
    const attachments = await Promise.all(
      files.map(async (file) => ({
        mime: file.type,
        url: await fileToDataUrl(file),
        filename: file.name,
      }))
    );

    await sendMessage(prompt, {
      files: attachments,
      agent: selectedAgent,
      model: selectedModel,
    });

    setPrompt('');
    setFiles([]);
  }, [prompt, files, isWorking, sendMessage, selectedAgent, selectedModel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          setFiles((prev) => [...prev, file]);
        }
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selectedFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="border border-border rounded-lg bg-background shadow-lg">
      {/* File attachments */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border-b border-border">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1 px-2 py-1 bg-secondary rounded text-xs"
            >
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button onClick={() => removeFile(index)} className="hover:text-error">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Text input */}
      <div className="p-3">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Send a message..."
          disabled={isWorking}
          className="w-full resize-none bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground min-h-[24px] max-h-[200px]"
          rows={1}
        />
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border">
        <div className="flex items-center gap-2">
          {/* File attachment */}
          <label className="cursor-pointer hover:text-foreground text-muted-foreground">
            <Paperclip className="h-4 w-4" />
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isWorking}
            />
          </label>

          {/* Agent selector */}
          <AgentSelector
            value={selectedAgent}
            onChange={setSelectedAgent}
            disabled={isWorking}
          />

          {/* Model selector */}
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={isWorking}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Character count */}
          <span className="text-xs text-muted-foreground">
            {prompt.length}
          </span>

          {/* Submit/Abort button */}
          {isWorking ? (
            <Button size="sm" variant="destructive" onPress={abort}>
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              onPress={handleSubmit}
              isDisabled={!prompt.trim() && files.length === 0}
            >
              <Send className="h-4 w-4 mr-1" />
              Send
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

### Agent Selector
```tsx
// components/session/agent-selector.tsx
import { Select, SelectItem } from '@/components/ui/select';
import { useAgents } from '@/hooks/useAgents';
import { Bot } from 'lucide-react';

interface AgentSelectorProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}

export function AgentSelector({ value, onChange, disabled }: AgentSelectorProps) {
  const { agents } = useAgents();

  return (
    <Select
      aria-label="Select agent"
      selectedKey={value}
      onSelectionChange={(key) => onChange(key as string)}
      isDisabled={disabled}
    >
      {agents.map((agent) => (
        <SelectItem key={agent.name} textValue={agent.name}>
          <div className="flex items-center gap-2">
            <Bot className="h-3 w-3" style={{ color: agent.color }} />
            <span className="text-sm">{agent.name}</span>
          </div>
        </SelectItem>
      ))}
    </Select>
  );
}
```

### Model Selector
```tsx
// components/session/model-selector.tsx
import { Select, SelectItem } from '@/components/ui/select';
import { useModels } from '@/hooks/useModels';
import { Cpu } from 'lucide-react';

interface ModelSelectorProps {
  value?: { providerID: string; modelID: string };
  onChange: (value: { providerID: string; modelID: string } | undefined) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const { models } = useModels();

  const selectedKey = value ? `${value.providerID}/${value.modelID}` : undefined;

  return (
    <Select
      aria-label="Select model"
      selectedKey={selectedKey}
      onSelectionChange={(key) => {
        if (!key) return onChange(undefined);
        const [providerID, modelID] = (key as string).split('/');
        onChange({ providerID, modelID });
      }}
      isDisabled={disabled}
    >
      {models.map((model) => (
        <SelectItem
          key={`${model.providerID}/${model.id}`}
          textValue={model.name}
        >
          <div className="flex items-center gap-2">
            <Cpu className="h-3 w-3" />
            <span className="text-sm">{model.name}</span>
            <span className="text-xs text-muted-foreground">{model.providerID}</span>
          </div>
        </SelectItem>
      ))}
    </Select>
  );
}
```

## Dependencies
- 13-connection-session-crud
- 05-ui-primitive-components
- 06-ui-dialog-menu

## Estimated Effort
1 day

## Notes
- Cmd/Ctrl+Enter is standard for chat submit
- Image paste from clipboard is convenient
- Consider command palette for slash commands
- [2026-01-01]: Implemented SessionInput with auto-resize, selectors, attachments, and abort/send actions. Files: components/session/session-input.tsx
