export interface AppShellSection {
  title: string;
  description: string;
}

export interface ShellPanelState {
  collapsed: boolean;
  width: number;
}

export interface OutlineHeading {
  id: string;
  text: string;
  level: number;
  line: number;
}

export interface CommandPaletteItem {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  group: "files" | "commands";
  path?: string;
}
