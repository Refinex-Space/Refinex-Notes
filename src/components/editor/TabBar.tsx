import { FileText, X } from "lucide-react";

import { useEditorStore } from "../../stores/editorStore";
import { useNoteStore } from "../../stores/noteStore";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

export function TabBar() {
  const openFiles = useNoteStore((state) => state.openFiles);
  const currentFile = useNoteStore((state) => state.currentFile);
  const documents = useNoteStore((state) => state.documents);
  const openFile = useNoteStore((state) => state.openFile);
  const closeFile = useNoteStore((state) => state.closeFile);

  const activeTab = useEditorStore((state) => state.activeTab);
  const unsavedChanges = useEditorStore((state) => state.unsavedChanges);
  const setActiveTab = useEditorStore((state) => state.setActiveTab);

  const activeValue = activeTab ?? currentFile ?? undefined;

  if (openFiles.length === 0) {
    return (
      <div className="flex h-12 items-center px-4 text-sm text-muted">
        暂无打开的笔记
      </div>
    );
  }

  return (
    <Tabs
      value={activeValue}
      onValueChange={(path) => {
        void openFile(path);
        setActiveTab(path);
      }}
    >
      <TabsList className="flex h-auto w-full justify-start overflow-x-auto rounded-2xl bg-transparent p-0">
        {openFiles.map((path) => {
          const document = documents[path];
          if (!document) {
            return null;
          }

          const isDirty = unsavedChanges.has(path);

          return (
            <TabsTrigger
              key={path}
              value={path}
              asChild
              onMouseDown={(event) => {
                if (event.button !== 1) {
                  return;
                }
                event.preventDefault();
                void closeFile(path).then(() => {
                  setActiveTab(useNoteStore.getState().currentFile);
                });
              }}
            >
              <div className="group inline-flex min-w-[180px] items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2 text-sm font-medium outline-none transition data-[state=active]:border-border/70 data-[state=active]:bg-accent/12 data-[state=active]:text-fg">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" />
                  <span className="truncate">{document.name}</span>
                  {isDirty ? (
                    <span
                      aria-label="未保存修改"
                      className="h-2 w-2 rounded-full bg-accent"
                    />
                  ) : null}
                </span>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted opacity-0 transition hover:bg-accent/10 hover:text-fg group-hover:opacity-100"
                  aria-label={`关闭 ${document.name}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void closeFile(path).then(() => {
                      setActiveTab(useNoteStore.getState().currentFile);
                    });
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}

export default TabBar;
