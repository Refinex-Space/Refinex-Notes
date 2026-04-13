import { AlignCenter, AlignLeft, AlignRight, ImageUp, Trash2 } from "lucide-react";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { NodeSelection } from "prosemirror-state";
import type { NodeView } from "prosemirror-view";
import { EditorView } from "prosemirror-view";
import { type Root, createRoot } from "react-dom/client";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "../../components/ui/popover";
import {
  pickImageFile,
  readImageFileAsDataUrl,
  type ImageNodeAttrs,
} from "../rich-ui";

type ImageAlignment = "left" | "center" | "right";

const imageToolbarButtonClasses = [
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 text-muted transition",
  "hover:border-accent/60 hover:bg-accent/10 hover:text-fg disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

function ImageNodeSurface(props: {
  attrs: ImageNodeAttrs;
  selected: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onAlign: (align: ImageAlignment) => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  const align = props.attrs.align ?? "center";

  return (
    <Popover open={props.selected}>
      <PopoverAnchor asChild>
        <figure
          className={[
            "refinex-image-node",
            props.selected ? "is-selected" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          data-align={align}
          onMouseDown={(event) => {
            event.preventDefault();
            props.onSelect();
          }}
        >
          <img
            src={props.attrs.src}
            alt={props.attrs.alt ?? ""}
            title={props.attrs.title ?? undefined}
            draggable={false}
          />
          {props.attrs.title ? <figcaption>{props.attrs.title}</figcaption> : null}
        </figure>
      </PopoverAnchor>

      {props.selected ? (
        <PopoverContent
          side="top"
          align="center"
          sideOffset={12}
          className="w-auto rounded-2xl p-2"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={imageToolbarButtonClasses}
              data-active={align === "left" ? "true" : "false"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => props.onAlign("left")}
              disabled={props.readOnly}
              aria-label="左对齐图片"
            >
              <AlignLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={imageToolbarButtonClasses}
              data-active={align === "center" ? "true" : "false"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => props.onAlign("center")}
              disabled={props.readOnly}
              aria-label="居中对齐图片"
            >
              <AlignCenter className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={imageToolbarButtonClasses}
              data-active={align === "right" ? "true" : "false"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => props.onAlign("right")}
              disabled={props.readOnly}
              aria-label="右对齐图片"
            >
              <AlignRight className="h-4 w-4" />
            </button>
            <span className="mx-1 h-6 w-px bg-border/70" />
            <button
              type="button"
              className={imageToolbarButtonClasses}
              onMouseDown={(event) => event.preventDefault()}
              onClick={props.onReplace}
              disabled={props.readOnly}
              aria-label="替换图片"
            >
              <ImageUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={imageToolbarButtonClasses}
              onMouseDown={(event) => event.preventDefault()}
              onClick={props.onDelete}
              disabled={props.readOnly}
              aria-label="删除图片"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </PopoverContent>
      ) : null}
    </Popover>
  );
}

export class ImageView implements NodeView {
  readonly dom: HTMLDivElement;

  readonly contentDOM = null;

  private readonly root: Root;

  private selected = false;

  constructor(
    private node: ProseMirrorNode,
    private readonly pmView: EditorView,
    private readonly getPos: () => number | undefined,
  ) {
    this.dom = document.createElement("div");
    this.dom.className = "refinex-image-node-host";
    this.root = createRoot(this.dom);
    this.render();
  }

  update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) {
      return false;
    }

    this.node = node;
    this.render();
    return true;
  }

  selectNode() {
    this.selected = true;
    this.render();
  }

  deselectNode() {
    this.selected = false;
    this.render();
  }

  stopEvent(event: Event): boolean {
    return event.target instanceof Node && this.dom.contains(event.target);
  }

  ignoreMutation(): boolean {
    return true;
  }

  destroy() {
    this.root.unmount();
  }

  private render() {
    this.root.render(
      <ImageNodeSurface
        attrs={this.node.attrs as ImageNodeAttrs}
        selected={this.selected}
        readOnly={!this.pmView.editable}
        onSelect={() => {
          const position = this.readPosition();
          if (position == null) {
            return;
          }
          this.pmView.dispatch(
            this.pmView.state.tr.setSelection(
              NodeSelection.create(this.pmView.state.doc, position),
            ),
          );
          this.pmView.focus();
        }}
        onAlign={(align) => {
          const position = this.readPosition();
          if (position == null) {
            return;
          }
          this.pmView.dispatch(
            this.pmView.state.tr.setNodeMarkup(position, undefined, {
              ...this.node.attrs,
              align,
            }),
          );
          this.pmView.focus();
        }}
        onReplace={() => {
          void this.replaceImage();
        }}
        onDelete={() => {
          const position = this.readPosition();
          if (position == null) {
            return;
          }
          this.pmView.dispatch(
            this.pmView.state.tr.delete(position, position + this.node.nodeSize),
          );
          this.pmView.focus();
        }}
      />,
    );
  }

  private async replaceImage() {
    const file = await pickImageFile();
    if (!file) {
      return;
    }

    const position = this.readPosition();
    if (position == null) {
      return;
    }

    try {
      const src = await readImageFileAsDataUrl(file);
      this.pmView.dispatch(
        this.pmView.state.tr.setNodeMarkup(position, undefined, {
          ...this.node.attrs,
          src,
          alt:
            (this.node.attrs.alt as string | null) ??
            file.name.replace(/\.[^.]+$/, ""),
        }),
      );
      this.pmView.focus();
    } catch (error) {
      console.error("替换图片失败", error);
    }
  }

  private readPosition() {
    const position = this.getPos();
    return typeof position === "number" ? position : null;
  }
}

export default ImageView;
