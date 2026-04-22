import { beforeEach, describe, expect, it, vi } from "vitest";

import { aiService } from "../../services/aiService";
import { fileService } from "../../services/fileService";
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

vi.mock("../../services/fileService", () => ({
  fileService: {
    isNativeAvailable: vi.fn(() => true),
    readFile: vi.fn(),
  },
}));

const providers: AIProviderInfo[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    providerKind: "deepseek",
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
    vi.mocked(fileService.isNativeAvailable).mockReturnValue(true);
    vi.mocked(fileService.readFile).mockResolvedValue("# Reference\n\nUseful context.\n");
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

  it("can exclude the current document from the generated AI context", async () => {
    seedEditorContext();
    useAIStore.setState({
      providers,
      modelsByProvider: { deepseek: models },
      activeProvider: "deepseek",
      activeModel: "deepseek-chat",
    });

    let capturedMessages: AICommandMessage[] = [];
    vi.mocked(aiService.stream).mockImplementation(async ({ messages }) => {
      capturedMessages = messages;
    });

    await useAIStore.getState().sendMessage("不要参考当前文章", {
      includeCurrentDocument: false,
    });

    expect(capturedMessages[0]?.content).toContain("路径: （当前文档上下文已移除）");
    expect(capturedMessages[0]?.content).not.toContain("Ship AI panel.");
    expect(capturedMessages[0]?.content).not.toContain("docs/Roadmap.md");
  });

  it("loads attached reference documents into the generated AI context", async () => {
    seedEditorContext();
    useAIStore.setState({
      providers,
      modelsByProvider: { deepseek: models },
      activeProvider: "deepseek",
      activeModel: "deepseek-chat",
    });

    let capturedMessages: AICommandMessage[] = [];
    vi.mocked(fileService.readFile).mockResolvedValue(
      "# Cursor Guide\n\n## Setup\n\nAttach me as additional context.\n",
    );
    vi.mocked(aiService.stream).mockImplementation(async ({ messages }) => {
      capturedMessages = messages;
    });

    await useAIStore.getState().sendMessage("结合附加文档回答", {
      attachedDocumentPaths: ["guides/Cursor Guide.md"],
    });

    expect(vi.mocked(fileService.readFile)).toHaveBeenCalledWith(
      "guides/Cursor Guide.md",
    );
    expect(capturedMessages[0]?.content).toContain("## 附加参考文档");
    expect(capturedMessages[0]?.content).toContain("guides/Cursor Guide.md");
    expect(capturedMessages[0]?.content).toContain("Attach me as additional context.");
  });

  it("creates isolated conversations that can be switched, renamed, and deleted", async () => {
    seedEditorContext();
    useAIStore.setState({
      providers,
      modelsByProvider: { deepseek: models },
      activeProvider: "deepseek",
      activeModel: "deepseek-chat",
    });

    vi.mocked(aiService.stream).mockImplementation(async ({ onToken }) => {
      onToken("完成");
    });

    const firstConversationId = useAIStore.getState().activeConversationId;

    await useAIStore.getState().sendMessage("第一轮讨论");

    const secondConversationId = useAIStore.getState().createConversation();
    await useAIStore.getState().sendMessage("第二轮讨论");

    useAIStore.getState().switchConversation(firstConversationId!);
    useAIStore.getState().renameConversation(firstConversationId!, "技术博客写作请求");

    const stateAfterRename = useAIStore.getState();
    const firstConversation = stateAfterRename.conversations.find(
      (conversation) => conversation.id === firstConversationId,
    );
    const secondConversation = stateAfterRename.conversations.find(
      (conversation) => conversation.id === secondConversationId,
    );

    expect(firstConversation?.title).toBe("技术博客写作请求");
    expect(firstConversation?.messages[0]).toEqual(
      expect.objectContaining({
        role: "user",
        content: "第一轮讨论",
      }),
    );
    expect(secondConversation?.messages[0]).toEqual(
      expect.objectContaining({
        role: "user",
        content: "第二轮讨论",
      }),
    );
    expect(stateAfterRename.messages[0]).toEqual(
      expect.objectContaining({
        role: "user",
        content: "第一轮讨论",
      }),
    );

    useAIStore.getState().deleteConversation(secondConversationId);

    expect(
      useAIStore
        .getState()
        .conversations.some((conversation) => conversation.id === secondConversationId),
    ).toBe(false);
  });

  it("persists conversation history and active conversation selection", async () => {
    const initialConversationId = useAIStore.getState().activeConversationId;

    useAIStore.getState().renameConversation(initialConversationId!, "持久化验证");
    const createdConversationId = useAIStore.getState().createConversation();
    useAIStore.getState().switchConversation(createdConversationId);

    const persisted = (await Promise.resolve(
      useAIStore.persist.getOptions().storage?.getItem("refinex-ai-chat-store"),
    )) as
      | {
          state?: {
            activeConversationId?: string;
            conversations?: Array<{ id: string; title: string }>;
          };
        }
      | null;

    expect(persisted).toMatchObject({
      state: {
        activeConversationId: createdConversationId,
      },
    });
    expect(persisted?.state?.conversations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: initialConversationId,
          title: "持久化验证",
        }),
        expect.objectContaining({
          id: createdConversationId,
          title: "新会话",
        }),
      ]),
    );
  });
});
