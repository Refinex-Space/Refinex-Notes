import { beforeEach, describe, expect, it, vi } from "vitest";

import { aiService } from "../../services/aiService";
import type {
  AICommandMessage,
  AIModelInfo,
  AIProviderInfo,
} from "../../types/ai";
import type { FileNode, NoteDocument } from "../../types/notes";
import { resetAIStore, useAIStore } from "../aiStore";
import { resetEditorStore, useEditorStore } from "../editorStore";
import { resetNoteStore, useNoteStore } from "../noteStore";

vi.mock("../../services/aiService", () => ({
  aiService: {
    isNativeAvailable: vi.fn(() => true),
    listProviders: vi.fn(),
    listModels: vi.fn(),
    stream: vi.fn(),
    cancelStream: vi.fn(),
  },
}));

const providers: AIProviderInfo[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    providerKind: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
  },
];

const models: AIModelInfo[] = [
  {
    providerId: "deepseek",
    modelId: "deepseek-chat",
    label: "DeepSeek Chat",
    isDefault: true,
  },
  {
    providerId: "deepseek",
    modelId: "deepseek-reasoner",
    label: "DeepSeek Reasoner",
    isDefault: false,
  },
];

function flushAsyncWork() {
  return Promise.resolve().then(() => Promise.resolve());
}

function seedEditorContext() {
  const document: NoteDocument = {
    path: "docs/Roadmap.md",
    name: "Roadmap.md",
    content: "# Roadmap\n\n## Phase 8\n\nShip AI panel.\n",
    savedContent: "# Roadmap\n\n## Phase 8\n\nShip AI panel.\n",
    language: "Markdown",
    gitStatus: "clean",
    isMarkdown: true,
  };
  const files = [
    {
      name: "docs",
      path: "docs",
      isDir: true,
      hasChildren: true,
      isLoaded: true,
      children: [
        {
          name: "Roadmap.md",
          path: "docs/Roadmap.md",
          isDir: false,
          hasChildren: false,
          isLoaded: true,
        },
      ],
    },
  ] satisfies FileNode[];

  useNoteStore.setState({
    files,
    documents: { [document.path]: document },
    currentFile: document.path,
    openFiles: [document.path, "docs/Ideas.md"],
    recentFiles: ["docs/Ideas.md", document.path],
  });
  useEditorStore.setState({
    cursorPosition: { line: 3, col: 3 },
  });
}

describe("aiStore", () => {
  beforeEach(() => {
    resetAIStore();
    resetNoteStore();
    resetEditorStore();
    vi.clearAllMocks();
    vi.mocked(aiService.isNativeAvailable).mockReturnValue(true);
    vi.mocked(aiService.cancelStream).mockResolvedValue(undefined);
  });

  it("loads providers and their model catalog from the native layer", async () => {
    vi.mocked(aiService.listProviders).mockResolvedValue(providers);
    vi.mocked(aiService.listModels).mockResolvedValue(models);

    await useAIStore.getState().loadProviders();

    expect(vi.mocked(aiService.listProviders)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(aiService.listModels)).toHaveBeenCalledWith("deepseek");
    expect(useAIStore.getState().providers).toEqual(providers);
    expect(useAIStore.getState().activeProvider).toBe("deepseek");
    expect(useAIStore.getState().activeModel).toBe("deepseek-chat");
  });

  it("builds a system prompt from editor context and appends streamed tokens", async () => {
    seedEditorContext();
    useAIStore.setState({
      providers,
      modelsByProvider: { deepseek: models },
      activeProvider: "deepseek",
      activeModel: "deepseek-chat",
    });

    let capturedMessages: AICommandMessage[] = [];
    vi.mocked(aiService.stream).mockImplementation(async ({ messages, onToken }) => {
      capturedMessages = messages;
      onToken("你好");
      onToken("，世界");
    });

    await useAIStore.getState().sendMessage("请总结这一段");

    expect(capturedMessages[0]?.role).toBe("system");
    expect(capturedMessages[0]?.content).toContain("docs/Roadmap.md");
    expect(capturedMessages[0]?.content).toContain("### 标题层级摘要");
    expect(capturedMessages.at(-1)).toEqual({
      role: "user",
      content: "请总结这一段",
    });
    expect(useAIStore.getState().messages).toEqual([
      expect.objectContaining({
        role: "user",
        content: "请总结这一段",
      }),
      expect.objectContaining({
        role: "assistant",
        content: "你好，世界",
      }),
    ]);
    expect(useAIStore.getState().isStreaming).toBe(false);
    expect(useAIStore.getState().errorMessage).toBeNull();
  });

  it("cancels the active stream and ignores late tokens after cancellation", async () => {
    seedEditorContext();
    useAIStore.setState({
      providers,
      modelsByProvider: { deepseek: models },
      activeProvider: "deepseek",
      activeModel: "deepseek-chat",
    });

    let pushToken = (_token: string) => {};
    let resolveStream = () => {};
    vi.mocked(aiService.stream).mockImplementation(
      ({ onToken }) =>
        new Promise<void>((resolve) => {
          pushToken = onToken;
          resolveStream = resolve;
        }),
    );

    const pending = useAIStore.getState().sendMessage("继续");
    await flushAsyncWork();

    expect(useAIStore.getState().isStreaming).toBe(true);

    await useAIStore.getState().cancelStream();
    pushToken("迟到的 token");
    resolveStream();
    await pending;
    await flushAsyncWork();

    expect(vi.mocked(aiService.cancelStream)).toHaveBeenCalledTimes(1);
    expect(useAIStore.getState().isStreaming).toBe(false);
    expect(useAIStore.getState().activeRequestId).toBeNull();
    expect(useAIStore.getState().messages).toEqual([
      expect.objectContaining({
        role: "user",
        content: "继续",
      }),
    ]);
  });
});
