import { Bold, Code2, Italic, Link2, Strikethrough } from "lucide-react";
import { toggleMark } from "prosemirror-commands";
import { TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

import { SkillPicker } from "../../components/ai/SkillPicker";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "../../components/ui/popover";
import { filterSkillsForSelection, listBuiltinSkills } from "../../services/skillService";
import type { SkillDefinition } from "../../types/skill";
import { getSelectionAnchorRect, isMarkActive } from "../rich-ui";
import { refinexSchema } from "../schema";

const buttonBaseClasses = [
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 transition",
  "hover:border-accent/60 hover:bg-accent/10",
].join(" ");

function markButtonClasses(active: boolean) {
  return [
    buttonBaseClasses,
    active
      ? "border-accent/70 bg-accent/15 text-fg"
      : "bg-transparent text-muted",
  ].join(" ");
}

export interface FloatingToolbarProps {
  view: EditorView | null;
  version: number;
  onRequestLinkEdit: (view: EditorView) => boolean;
  onRunSkill: (skill: SkillDefinition) => void | Promise<void>;
}

export function FloatingToolbar({
  view,
  version: _version,
  onRequestLinkEdit,
  onRunSkill,
}: FloatingToolbarProps) {
  if (!view || !(view.state.selection instanceof TextSelection) || view.state.selection.empty) {
    return null;
  }

  const anchor = getSelectionAnchorRect(
    view,
    view.state.selection.from,
    view.state.selection.to,
  );

  const runMarkCommand = (markName: "strong" | "em" | "strikethrough" | "code") => {
    toggleMark(refinexSchema.marks[markName])(view.state, view.dispatch, view);
    view.focus();
  };
  const skills = filterSkillsForSelection(listBuiltinSkills(), true);

  return (
    <Popover open>
      <PopoverAnchor asChild>
        <span
          aria-hidden="true"
          style={{
            position: "fixed",
            top: anchor.top,
            left: anchor.left,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={12}
        className="w-auto rounded-xl p-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={markButtonClasses(isMarkActive(view.state, "strong"))}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runMarkCommand("strong")}
            aria-label="切换加粗"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={markButtonClasses(isMarkActive(view.state, "em"))}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runMarkCommand("em")}
            aria-label="切换斜体"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={markButtonClasses(isMarkActive(view.state, "strikethrough"))}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runMarkCommand("strikethrough")}
            aria-label="切换删除线"
          >
            <Strikethrough className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={markButtonClasses(isMarkActive(view.state, "code"))}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runMarkCommand("code")}
            aria-label="切换行内代码"
          >
            <Code2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={markButtonClasses(isMarkActive(view.state, "link"))}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onRequestLinkEdit(view);
            }}
            aria-label="编辑链接"
          >
            <Link2 className="h-4 w-4" />
          </button>
          <SkillPicker
            skills={skills}
            onSelect={(skill) => {
              void onRunSkill(skill);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default FloatingToolbar;
